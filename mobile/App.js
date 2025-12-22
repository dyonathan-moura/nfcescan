import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput,
  ScrollView,
  RefreshControl,
  Alert,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { PieChart } from 'react-native-chart-kit';
import { useFonts, Archivo_400Regular, Archivo_500Medium, Archivo_700Bold, Archivo_900Black } from '@expo-google-fonts/archivo';
import { LinearGradient } from 'expo-linear-gradient';

// Design System
import { COLORS, FONTS, SIZES, SHADOWS } from './theme';

// ============================================================================
// CONFIGURAÇÃO - API em produção no Render
// ============================================================================
const API_URL = 'https://nfcescan-api.onrender.com';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

// Filtros rápidos de data
const FILTROS_DATA = [
  { id: 'todos', label: 'Todos', dias: null },
  { id: '7dias', label: '7 Dias', dias: 7 },
  { id: '30dias', label: '30 Dias', dias: 30 },
  { id: 'mes', label: 'Este Mês', dias: 'mes' },
];

// Ícones de categoria - Agora vem do banco, mas mantemos fallback
const getCategoryIcon = (categoria) => categoria?.icone || '📦';

export default function App() {
  // Carregar fontes Archivo
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_700Bold,
    Archivo_900Black,
  });

  // Estados - Câmera
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [nfceData, setNfceData] = useState(null);
  const [scanned, setScanned] = useState(false); // Debounce para evitar múltiplas leituras

  // Estados - Histórico
  const [showHistorico, setShowHistorico] = useState(false);
  const [notas, setNotas] = useState([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [selectedNota, setSelectedNota] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [modoBusca, setModoBusca] = useState(false);

  // Estados - Modal de Renomear
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameOriginal, setRenameOriginal] = useState('');

  // Estados - Categorias
  const [categorias, setCategorias] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedItemForCategory, setSelectedItemForCategory] = useState(null);
  const [createCategoryMode, setCreateCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');

  // Estados - Dashboard
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardFiltro, setDashboardFiltro] = useState('mes');

  const cameraRef = useRef(null);

  // Buscar notas do servidor
  const fetchNotas = useCallback(async (searchTerm = '', filtro = 'todos') => {
    setLoadingNotas(true);

    try {
      let url = `${API_URL}/notas?limit=100`;

      // Adicionar busca
      if (searchTerm.trim()) {
        url += `&busca=${encodeURIComponent(searchTerm.trim())}`;
      }

      // Adicionar filtro de data
      if (filtro !== 'todos') {
        const hoje = new Date();
        let dataInicio;

        if (filtro === 'mes') {
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        } else {
          const diasMap = { '7dias': 7, '30dias': 30 };
          const dias = diasMap[filtro] || 30;
          dataInicio = new Date(hoje);
          dataInicio.setDate(hoje.getDate() - dias);
        }

        const dataStr = dataInicio.toISOString().split('T')[0];
        url += `&data_inicio=${dataStr}`;
      }

      const response = await axios.get(url, { timeout: 10000 });
      setNotas(response.data.notas || []);
      setModoBusca(false);  // Modo lista de notas
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
    } finally {
      setLoadingNotas(false);
      setRefreshing(false);
    }
  }, []);

  // Buscar produtos pelo nome (busca comparativa)
  const fetchProdutos = useCallback(async (termo) => {
    if (!termo || termo.trim().length < 2) {
      setProdutos([]);
      setModoBusca(false);
      return;
    }

    setLoadingNotas(true);

    try {
      const url = `${API_URL}/itens/busca?q=${encodeURIComponent(termo.trim())}`;
      const response = await axios.get(url, { timeout: 10000 });
      setProdutos(response.data.itens || []);
      setModoBusca(true);  // Modo busca de produtos
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProdutos([]);
    } finally {
      setLoadingNotas(false);
    }
  }, []);

  // Buscar categorias do servidor
  const fetchCategorias = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/categorias`);
      setCategorias(response.data.categorias || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  }, []);

  // Buscar dados do dashboard
  const fetchDashboard = useCallback(async (filtro = 'mes') => {
    setLoadingDashboard(true);
    try {
      const hoje = new Date();
      let dataInicio, dataFim;

      if (filtro === 'mes') {
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      } else if (filtro === 'mesPassado') {
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      } else if (filtro === '3meses') {
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      } else if (filtro === 'ano') {
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        dataFim = new Date(hoje.getFullYear() + 1, 0, 1);
      }

      const inicio = dataInicio.toISOString().split('T')[0];
      const fim = dataFim.toISOString().split('T')[0];

      const response = await axios.get(`${API_URL}/dashboard/resumo?data_inicio=${inicio}&data_fim=${fim}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  // Carregar notas e categorias quando abrir histórico
  useEffect(() => {
    if (showHistorico) {
      fetchNotas(busca, filtroAtivo);
      fetchCategorias();
    }
  }, [showHistorico]);

  // Carregar dashboard quando abrir
  useEffect(() => {
    if (showDashboard) {
      fetchDashboard(dashboardFiltro);
    }
  }, [showDashboard, dashboardFiltro]);

  // Tela de carregamento enquanto fontes carregam
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textSecondary, marginTop: 16, fontWeight: '500' }}>
          Carregando...
        </Text>
      </View>
    );
  }

  // Verificar permissão
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Acesso à Câmera</Text>
        <Text style={styles.permissionText}>
          Precisamos da câmera para ler QR Codes
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handlers
  const toggleCameraFacing = () => setFacing(f => f === 'back' ? 'front' : 'back');
  const toggleFlash = () => setFlashEnabled(f => !f);

  const showHumanError = (message) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };

  const handleSearch = () => {
    if (busca.trim().length >= 2) {
      fetchProdutos(busca);  // Busca produtos quando tem texto
    } else {
      fetchNotas('', filtroAtivo);  // Volta para notas quando limpa
      setModoBusca(false);
    }
  };

  const handleFiltroChange = (filtroId) => {
    setFiltroAtivo(filtroId);
    setBusca('');  // Limpa busca ao mudar filtro
    setModoBusca(false);
    fetchNotas('', filtroId);
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (modoBusca) {
      fetchProdutos(busca);
    } else {
      fetchNotas('', filtroAtivo);
    }
  };

  // Abrir detalhes da nota
  const openNotaDetail = (nota) => {
    setSelectedNota(nota);
  };

  // Abrir nota a partir de um produto
  const openNotaFromProduto = async (notaId) => {
    try {
      const response = await axios.get(`${API_URL}/notas/${notaId}`);
      setSelectedNota(response.data);
    } catch (error) {
      console.error('Erro ao buscar nota:', error);
    }
  };

  // Long press em item para mudar categoria
  const handleItemLongPress = (item) => {
    setSelectedItemForCategory(item);
    setShowCategoryModal(true);
  };

  // Atualizar categoria do item
  const updateItemCategory = async (categoriaId) => {
    if (!selectedItemForCategory) return;

    try {
      const url = `${API_URL}/item/${selectedItemForCategory.id}/categoria?categoria_id=${categoriaId}`;
      await axios.put(url);

      // Atualizar item localmente
      if (selectedNota) {
        const itensAtualizados = selectedNota.itens.map(item =>
          item.id === selectedItemForCategory.id
            ? { ...item, categoria: categorias.find(c => c.id === categoriaId) }
            : item
        );
        setSelectedNota({ ...selectedNota, itens: itensAtualizados });
      }

      Alert.alert('✅', 'Categoria atualizada!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar');
    } finally {
      setShowCategoryModal(false);
      setSelectedItemForCategory(null);
    }
  };

  // Criar nova categoria e atribuir ao item
  const createNewCategory = async () => {
    if (!newCategoryName.trim() || !newCategoryIcon.trim()) {
      Alert.alert('Atenção', 'Preencha o nome e o emoji');
      return;
    }

    try {
      const url = `${API_URL}/categorias?nome=${encodeURIComponent(newCategoryName.trim())}&icone=${encodeURIComponent(newCategoryIcon.trim())}&cor=%23666666`;
      const response = await axios.post(url);
      const novaCategoria = response.data;

      // Adicionar à lista local
      setCategorias([...categorias, novaCategoria]);

      // Atribuir ao item automaticamente
      if (selectedItemForCategory) {
        await updateItemCategory(novaCategoria.id);
      }

      // Limpar e fechar
      setNewCategoryName('');
      setNewCategoryIcon('');
      setCreateCategoryMode(false);

      Alert.alert('✅', `Categoria "${novaCategoria.nome}" criada!`);
    } catch (error) {
      if (error.response?.status === 400) {
        Alert.alert('Erro', 'Essa categoria já existe');
      } else {
        Alert.alert('Erro', 'Não foi possível criar');
      }
    }
  };

  // Abrir modal de renomear
  const handleRenameEstabelecimento = (nomeAtual) => {
    setRenameOriginal(nomeAtual);
    setRenameValue(nomeAtual);
    setShowRenameModal(true);
  };

  // Confirmar renomeação
  const confirmRename = async () => {
    if (!renameValue.trim() || renameValue.trim() === renameOriginal) {
      setShowRenameModal(false);
      return;
    }

    try {
      const url = `${API_URL}/estabelecimento/renomear?nome_atual=${encodeURIComponent(renameOriginal)}&novo_nome=${encodeURIComponent(renameValue.trim())}`;
      const response = await axios.put(url);

      Alert.alert(
        '✅ Sucesso!',
        `${response.data.notas_atualizadas} nota(s) atualizada(s).`
      );

      // Atualizar nota selecionada localmente
      if (selectedNota) {
        setSelectedNota({ ...selectedNota, estabelecimento: renameValue.trim() });
      }

      // Recarregar lista
      fetchNotas('', filtroAtivo);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível renomear o fornecedor.');
    } finally {
      setShowRenameModal(false);
    }
  };

  // Formatar data para exibição (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Data não disponível';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Handler para leitura nativa de QR Code (muito mais rápido)
  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanned || isLoading) return; // Debounce

    // Verificar se parece uma URL de NFC-e
    if (!data || !data.startsWith('http')) return;

    setScanned(true);
    setIsLoading(true);
    setErrorVisible(false);

    // Feedback háptico
    Vibration.vibrate(100);

    try {
      const response = await axios.post(
        `${API_URL}/scan/url?url=${encodeURIComponent(data)}`,
        {},
        { timeout: 30000 }
      );

      if (response.status === 200) {
        setNfceData(response.data);
        setModalVisible(true);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        showHumanError(
          'Não parece ser um QR Code de NFC-e válido.\n\n💡 Dica: Procure o QR Code no cupom fiscal.'
        );
      } else if (error.response?.status === 500) {
        showHumanError('O site da nota fiscal está fora do ar.');
      } else {
        showHumanError('Erro de conexão.\n\n• Verifique o Wi-Fi\n• O servidor está rodando?');
      }
    } finally {
      setIsLoading(false);
      // Reset após 2 segundos para permitir nova leitura
      setTimeout(() => setScanned(false), 2000);
    }
  };

  // Renderizar item da nota (com clique funcional)
  const renderNotaItem = ({ item }) => (
    <TouchableOpacity style={styles.notaCard} onPress={() => openNotaDetail(item)}>
      <View style={styles.notaHeader}>
        <Text style={styles.notaEstabelecimento} numberOfLines={1}>
          {item.estabelecimento}
        </Text>
        <Text style={styles.notaTotal}>R$ {item.total?.toFixed(2)}</Text>
      </View>
      <Text style={styles.notaData}>
        📅 {formatDate(item.data_emissao)}
      </Text>
      <Text style={styles.notaItens}>
        {item.itens?.length || 0} itens
      </Text>
    </TouchableOpacity>
  );

  // Renderizar item do resultado (no modal) - Clique para mudar categoria
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemRow}
      onPress={() => handleItemLongPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.itemIcon}>{getCategoryIcon(item.categoria)}</Text>
      <Text style={styles.itemName} numberOfLines={2}>{item.nome}</Text>
      <Text style={styles.itemQtd}>{item.qtd}x</Text>
      <Text style={styles.itemValor}>R$ {item.valor.toFixed(2)}</Text>
    </TouchableOpacity>
  );

  // Renderizar produto na busca comparativa
  const renderProdutoItem = ({ item }) => (
    <TouchableOpacity
      style={styles.produtoCard}
      onPress={() => openNotaFromProduto(item.nota_id)}
    >
      <Text style={styles.produtoIcon}>{getCategoryIcon(item.categoria)}</Text>
      <View style={styles.produtoInfo}>
        <Text style={styles.produtoNome} numberOfLines={2}>{item.produto}</Text>
        <Text style={styles.produtoMercado}>{item.estabelecimento}</Text>
      </View>
      <View style={styles.produtoPreco}>
        <Text style={styles.produtoValor}>R$ {item.valor_unitario?.toFixed(2)}</Text>
        <Text style={styles.produtoData}>{formatDate(item.data_emissao)}</Text>
      </View>
    </TouchableOpacity>
  );

  // ===== TELA DE DASHBOARD =====
  if (showDashboard) {
    const screenWidth = Dimensions.get('window').width;

    // Preparar dados para gráfico de pizza
    const chartData = dashboardData?.categorias?.map(cat => ({
      name: cat.nome,
      population: cat.total,
      color: cat.cor,
      legendFontColor: '#333',
      legendFontSize: 12,
    })) || [];

    return (
      <SafeAreaView style={styles.historicoContainer}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.historicoHeader}>
          <TouchableOpacity onPress={() => setShowDashboard(false)}>
            <Text style={styles.backButton}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.historicoTitle}>📊 Relatórios</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 15 }}>
          {/* Filtros de Período */}
          <View style={styles.dashboardFilterRow}>
            {[
              { id: 'mes', label: 'Este Mês' },
              { id: 'mesPassado', label: 'Mês Passado' },
              { id: '3meses', label: '3 Meses' },
              { id: 'ano', label: 'Este Ano' },
            ].map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.dashboardFilterBtn, dashboardFiltro === f.id && styles.dashboardFilterActive]}
                onPress={() => setDashboardFiltro(f.id)}
              >
                <Text style={[styles.dashboardFilterText, dashboardFiltro === f.id && styles.dashboardFilterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loadingDashboard ? (
            <ActivityIndicator size="large" color="#4a90d9" style={{ marginTop: 50 }} />
          ) : dashboardData ? (
            <>
              {/* Card Total */}
              <View style={styles.dashboardTotalCard}>
                <Text style={styles.dashboardTotalLabel}>Total no Período</Text>
                <Text style={styles.dashboardTotalValue}>
                  R$ {dashboardData.total_periodo?.toFixed(2)}
                </Text>
              </View>

              {/* Gráfico de Pizza */}
              {chartData.length > 0 ? (
                <View style={styles.chartContainer}>
                  <PieChart
                    data={chartData}
                    width={screenWidth - 30}
                    height={220}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                </View>
              ) : (
                <Text style={styles.emptyText}>Nenhum gasto no período</Text>
              )}

              {/* Legenda das Categorias */}
              <Text style={styles.dashboardSectionTitle}>Detalhamento</Text>
              {dashboardData.categorias?.map(cat => (
                <View key={cat.id} style={styles.dashboardCategoryRow}>
                  <Text style={styles.dashboardCategoryIcon}>{cat.icone}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dashboardCategoryName}>{cat.nome}</Text>
                    <View style={[styles.dashboardBar, { width: `${cat.porcentagem}%`, backgroundColor: cat.cor }]} />
                  </View>
                  <View style={styles.dashboardCategoryValues}>
                    <Text style={styles.dashboardCategoryTotal}>R$ {cat.total.toFixed(2)}</Text>
                    <Text style={styles.dashboardCategoryPercent}>{cat.porcentagem}%</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyText}>Erro ao carregar dados</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===== TELA DE HISTÓRICO =====
  if (showHistorico) {
    return (
      <SafeAreaView style={styles.historicoContainer}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.historicoHeader}>
          <TouchableOpacity onPress={() => setShowHistorico(false)}>
            <Text style={styles.backButton}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.historicoTitle}>Histórico</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Barra de Busca */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Buscar mercado ou produto..."
            placeholderTextColor="#999"
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        {/* Filtros Rápidos */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtrosContainer}
          contentContainerStyle={styles.filtrosContent}
        >
          {FILTROS_DATA.map((filtro) => (
            <TouchableOpacity
              key={filtro.id}
              style={[
                styles.filtroChip,
                filtroAtivo === filtro.id && styles.filtroChipAtivo
              ]}
              onPress={() => handleFiltroChange(filtro.id)}
            >
              <Text style={[
                styles.filtroText,
                filtroAtivo === filtro.id && styles.filtroTextAtivo
              ]}>
                {filtro.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Info do filtro/busca */}
        {modoBusca ? (
          <Text style={styles.filtroInfo}>
            🔍 {produtos.length} produto(s) encontrado(s) para "{busca}"
          </Text>
        ) : (busca || filtroAtivo !== 'todos') && (
          <Text style={styles.filtroInfo}>
            {notas.length} resultado(s)
            {filtroAtivo !== 'todos' ? ` • ${FILTROS_DATA.find(f => f.id === filtroAtivo)?.label}` : ''}
          </Text>
        )}

        {/* Lista Híbrida: Produtos OU Notas */}
        {loadingNotas ? (
          <ActivityIndicator size="large" color="#4a90d9" style={{ marginTop: 50 }} />
        ) : modoBusca ? (
          // MODO BUSCA: Lista de Produtos
          <FlatList
            data={produtos}
            renderItem={renderProdutoItem}
            keyExtractor={(item, index) => `produto-${item.item_id}-${index}`}
            style={styles.notasList}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
            }
          />
        ) : (
          // MODO NORMAL: Lista de Notas
          <FlatList
            data={notas}
            renderItem={renderNotaItem}
            keyExtractor={(item, index) => `nota-${index}`}
            style={styles.notasList}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhuma nota salva ainda</Text>
            }
          />
        )}

        {/* Modal de Detalhes da Nota (do Histórico) */}
        <Modal
          animationType="slide"
          visible={selectedNota !== null}
          onRequestClose={() => setSelectedNota(null)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>{selectedNota?.estabelecimento}</Text>
                <TouchableOpacity
                  onPress={() => handleRenameEstabelecimento(selectedNota?.estabelecimento)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>✏️</Text>
                </TouchableOpacity>
              </View>
              {selectedNota?.endereco && (
                <Text style={styles.modalEndereco}>📍 {selectedNota.endereco}</Text>
              )}
              <Text style={styles.modalSubtitle}>
                📅 {formatDate(selectedNota?.data_emissao)}
              </Text>
              {selectedNota?.cached && (
                <Text style={styles.cachedBadge}>⚡ Do cache</Text>
              )}
            </View>

            <FlatList
              data={selectedNota?.itens || []}
              renderItem={renderItem}
              keyExtractor={(item, index) => `detail-item-${index}`}
              style={styles.itemsList}
            />

            <View style={styles.modalFooter}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>R$ {selectedNota?.total?.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.newScanButton} onPress={() => setSelectedNota(null)}>
              <Text style={styles.newScanButtonText}>← Voltar</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>

        {/* Modal de Seleção de Categoria */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showCategoryModal}
          onRequestClose={() => { setShowCategoryModal(false); setCreateCategoryMode(false); }}
        >
          <View style={styles.renameModalOverlay}>
            <View style={[styles.renameModalContent, { maxHeight: '70%' }]}>

              {createCategoryMode ? (
                // ====== MODO CRIAR CATEGORIA ======
                <>
                  <Text style={styles.renameModalTitle}>➕ Nova Categoria</Text>
                  <Text style={styles.renameModalSubtitle}>
                    Use o teclado de emojis do seu celular
                  </Text>

                  <TextInput
                    style={styles.renameInput}
                    placeholder="Nome (ex: Pets)"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                  />

                  <TextInput
                    style={[styles.renameInput, { fontSize: 24, textAlign: 'center' }]}
                    placeholder="Emoji (ex: 🐕)"
                    value={newCategoryIcon}
                    onChangeText={setNewCategoryIcon}
                    maxLength={4}
                  />

                  <View style={styles.renameButtons}>
                    <TouchableOpacity
                      style={styles.renameCancelButton}
                      onPress={() => setCreateCategoryMode(false)}
                    >
                      <Text style={styles.renameCancelText}>← Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.renameSaveButton}
                      onPress={createNewCategory}
                    >
                      <Text style={styles.renameSaveText}>Criar e Usar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // ====== MODO LISTAR CATEGORIAS ======
                <>
                  <Text style={styles.renameModalTitle}>🏷️ Escolha a Categoria</Text>
                  <Text style={styles.renameModalSubtitle}>
                    {selectedItemForCategory?.nome}
                  </Text>

                  {/* Botão Criar Nova */}
                  <TouchableOpacity
                    style={styles.createCategoryButton}
                    onPress={() => setCreateCategoryMode(true)}
                  >
                    <Text style={styles.createCategoryText}>➕ Nova Categoria</Text>
                  </TouchableOpacity>

                  <FlatList
                    data={categorias}
                    keyExtractor={(item) => `cat-${item.id}`}
                    style={{ marginTop: 10 }}
                    renderItem={({ item: cat }) => (
                      <TouchableOpacity
                        style={styles.categorySelectItem}
                        onPress={() => updateItemCategory(cat.id)}
                      >
                        <Text style={styles.categoryIcon}>{cat.icone}</Text>
                        <Text style={styles.categoryName}>{cat.nome}</Text>
                      </TouchableOpacity>
                    )}
                  />

                  <TouchableOpacity
                    style={styles.cancelButtonStandalone}
                    onPress={() => setShowCategoryModal(false)}
                  >
                    <Text style={styles.renameCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          </View>
        </Modal>

        {/* Modal de Renomear (funciona no Android) */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showRenameModal}
          onRequestClose={() => setShowRenameModal(false)}
        >
          <View style={styles.renameModalOverlay}>
            <View style={styles.renameModalContent}>
              <Text style={styles.renameModalTitle}>✏️ Renomear Fornecedor</Text>
              <Text style={styles.renameModalSubtitle}>
                Esse apelido será aplicado a todas as notas deste local.
              </Text>
              <TextInput
                style={styles.renameInput}
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="Nome do fornecedor"
                autoFocus={true}
              />
              <View style={styles.renameButtons}>
                <TouchableOpacity
                  style={styles.renameCancelButton}
                  onPress={() => setShowRenameModal(false)}
                >
                  <Text style={styles.renameCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.renameSaveButton}
                  onPress={confirmRename}
                >
                  <Text style={styles.renameSaveText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ===== TELA DA CÂMERA =====
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <CameraView
        style={styles.camera}
        facing={facing}
        enableTorch={flashEnabled}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      >
        {/* Overlay com Mira */}
        <View style={styles.overlay}>
          <View style={styles.overlayDark} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlayDark} />
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlayDark} />
          </View>
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>📱 Enquadre o QR Code</Text>
          </View>
          <View style={styles.overlayDark} />
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Processando...</Text>
          </View>
        )}

        {/* Erro */}
        {errorVisible && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.errorButton} onPress={() => setErrorVisible(false)}>
                <Text style={styles.errorButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Controles */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, flashEnabled && styles.controlButtonActive]}
            onPress={toggleFlash}
          >
            <Text style={styles.controlButtonText}>{flashEnabled ? '🔦' : '💡'}</Text>
          </TouchableOpacity>

          {/* Indicador de Status (não é mais botão) */}
          <View style={[styles.scanIndicator, scanned && styles.scanIndicatorActive]}>
            <Text style={styles.scanIndicatorText}>
              {isLoading ? '⏳' : scanned ? '✅' : '📷'}
            </Text>
          </View>

          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
            <Text style={styles.controlButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Botões de Navegação */}
        <View style={styles.navButtonsRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setShowHistorico(true)}
          >
            <Text style={styles.navButtonText}>📋 Histórico</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.navButtonDashboard]}
            onPress={() => setShowDashboard(true)}
          >
            <Text style={styles.navButtonText}>📊 Relatórios</Text>
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Modal de Resultado */}
      <Modal animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{nfceData?.estabelecimento}</Text>
            <Text style={styles.modalSubtitle}>{nfceData?.meta?.data_processamento}</Text>
            {nfceData?.cached && (
              <Text style={styles.cachedBadge}>⚡ Carregado do cache</Text>
            )}
          </View>

          <FlatList
            data={nfceData?.itens || []}
            renderItem={renderItem}
            keyExtractor={(item, index) => `item-${index}`}
            style={styles.itemsList}
          />

          <View style={styles.modalFooter}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>R$ {nfceData?.total?.toFixed(2)}</Text>
          </View>

          <TouchableOpacity style={styles.newScanButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.newScanButtonText}>📷 Nova Leitura</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Permissão
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 30 },
  permissionIcon: { fontSize: 60, marginBottom: 20 },
  permissionTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  permissionText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 30 },
  permissionButton: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 15, borderRadius: SIZES.radiusLg },
  permissionButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  // Câmera
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: SCAN_AREA_SIZE },
  scanArea: { width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE, backgroundColor: 'transparent' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: COLORS.success, borderWidth: 4 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  instructionContainer: { backgroundColor: COLORS.surfaceGlass, paddingVertical: 15, alignItems: 'center' },
  instructionText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '500' },

  // Loading/Erro
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,12,21,0.9)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textPrimary, fontSize: 18, marginTop: 15 },
  errorOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,12,21,0.95)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  errorCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMd, padding: 25, alignItems: 'center', maxWidth: 300, borderWidth: 1, borderColor: COLORS.border },
  errorIcon: { fontSize: 50, marginBottom: 15 },
  errorText: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  errorButton: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: SIZES.radiusLg },
  errorButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  // Controles
  controlsContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 30 },
  controlButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  controlButtonActive: { backgroundColor: 'rgba(74,222,128,0.4)' },
  controlButtonText: { fontSize: 24 },

  // Scan Indicator (não é mais botão)
  scanIndicator: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  scanIndicatorActive: { backgroundColor: 'rgba(74,222,128,0.5)', borderColor: '#4ade80' },
  scanIndicatorText: { fontSize: 32 },

  // Botão Histórico
  historicoButton: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  historicoButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Histórico
  historicoContainer: { flex: 1, backgroundColor: COLORS.background },
  historicoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historicoTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  backButton: { fontSize: 16, color: COLORS.secondary },

  // Busca
  searchContainer: { padding: 15, backgroundColor: COLORS.surface },
  searchInput: { backgroundColor: COLORS.background, borderRadius: SIZES.radiusSm, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },

  // Filtros
  filtrosContainer: { backgroundColor: COLORS.surface, maxHeight: 60 },
  filtrosContent: { paddingHorizontal: 15, paddingVertical: 10, gap: 10 },
  filtroChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.background, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  filtroChipAtivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroText: { fontSize: 14, color: COLORS.textSecondary },
  filtroTextAtivo: { color: COLORS.white, fontWeight: '600' },
  filtroInfo: { paddingHorizontal: 15, paddingVertical: 8, fontSize: 13, color: COLORS.textSecondary, backgroundColor: COLORS.surface },

  // Lista de Notas
  notasList: { flex: 1, padding: 15 },
  notaCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  notaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notaEstabelecimento: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  notaTotal: { fontSize: 16, fontWeight: 'bold', color: COLORS.secondary },
  notaData: { fontSize: 13, color: COLORS.textSecondary, marginTop: 5 },
  notaItens: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 50, fontSize: 16 },

  // Card de Produto (busca comparativa)
  produtoCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  produtoIcon: { fontSize: 24, marginRight: 12 },
  produtoInfo: { flex: 1, marginRight: 10 },
  produtoNome: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  produtoMercado: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  produtoPreco: { alignItems: 'flex-end' },
  produtoValor: { fontSize: 18, fontWeight: 'bold', color: COLORS.success },
  produtoData: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { backgroundColor: COLORS.surface, padding: 20, paddingTop: 30, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold', flex: 1 },
  editButton: { padding: 8 },
  editButtonText: { fontSize: 20 },
  modalEndereco: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6 },
  modalSubtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 5 },
  cachedBadge: { color: COLORS.success, fontSize: 12, marginTop: 5 },
  itemsList: { flex: 1, padding: 10 },
  itemRow: { flexDirection: 'row', backgroundColor: COLORS.surface, padding: 12, marginVertical: 4, borderRadius: SIZES.radiusSm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  itemIcon: { fontSize: 20, marginRight: 10 },
  itemName: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  itemQtd: { fontSize: 14, color: COLORS.textSecondary, marginHorizontal: 10 },
  itemValor: { fontSize: 14, fontWeight: 'bold', color: COLORS.success },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  newScanButton: { backgroundColor: COLORS.primary, margin: 15, padding: 18, borderRadius: SIZES.radiusSm, alignItems: 'center' },
  newScanButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },

  // Modal de Renomear
  renameModalOverlay: { flex: 1, backgroundColor: 'rgba(11,12,21,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  renameModalContent: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 20, width: '100%', maxWidth: 350, borderWidth: 1, borderColor: COLORS.border },
  renameModalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: COLORS.textPrimary },
  renameModalSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16 },
  renameInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radiusSm, padding: 12, fontSize: 16, marginBottom: 20, backgroundColor: COLORS.background, color: COLORS.textPrimary },
  renameButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  renameCancelButton: { flex: 1, padding: 12, marginRight: 8, borderRadius: SIZES.radiusSm, backgroundColor: COLORS.background, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: COLORS.border },
  renameCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  renameSaveButton: { flex: 1, padding: 12, marginLeft: 8, borderRadius: 8, backgroundColor: '#4a90d9', alignItems: 'center' },
  renameSaveText: { color: '#fff', fontWeight: '600' },

  // Modal de Seleção de Categoria
  categorySelectItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  categoryIcon: { fontSize: 24, marginRight: 12 },
  categoryName: { fontSize: 16, color: '#333' },
  createCategoryButton: { backgroundColor: '#4a90d9', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  createCategoryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelButtonStandalone: { padding: 14, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', marginTop: 15 },

  // Navigation Buttons
  navButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingBottom: 20 },
  navButton: { backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25 },
  navButtonDashboard: { backgroundColor: 'rgba(74,144,217,0.9)' },
  navButtonText: { fontSize: 16, fontWeight: '600', color: '#333' },

  // Dashboard
  dashboardFilterRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  dashboardFilterBtn: { paddingVertical: 8, paddingHorizontal: 16, marginHorizontal: 5, borderRadius: 20, backgroundColor: '#e0e0e0' },
  dashboardFilterActive: { backgroundColor: '#4a90d9' },
  dashboardFilterText: { fontSize: 13, color: '#666' },
  dashboardFilterTextActive: { color: '#fff', fontWeight: '600' },
  dashboardTotalCard: { backgroundColor: '#4a90d9', borderRadius: 16, padding: 25, alignItems: 'center', marginBottom: 20 },
  dashboardTotalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  dashboardTotalValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 5 },
  chartContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 20, alignItems: 'center' },
  dashboardSectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  dashboardCategoryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, marginBottom: 8, borderRadius: 12 },
  dashboardCategoryIcon: { fontSize: 28, marginRight: 12 },
  dashboardCategoryName: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 4 },
  dashboardBar: { height: 6, borderRadius: 3, minWidth: 10 },
  dashboardCategoryValues: { alignItems: 'flex-end', marginLeft: 10 },
  dashboardCategoryTotal: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  dashboardCategoryPercent: { fontSize: 12, color: '#888' },
});
