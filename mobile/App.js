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
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { PieChart } from 'react-native-chart-kit';
import { useFonts, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

// Design System
import { COLORS, FONTS, SIZES, SHADOWS } from './theme';
import GradientButton from './src/components/GradientButton';
import { FriendlyModal, CategoryGrid, SkeletonList, Input, EmptyState, CategoryIcon, LottieAnimation, KPIIcon } from './src/components';

// Utilities
import { formatCurrency, formatDateShort, formatDateFull } from './src/utils/formatters';

// ============================================================================
// CONFIGURAÇÃO - API em produção no Render
// ============================================================================
const API_URL = 'https://nfcescan-api.onrender.com';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

// Clean Frame Scanner Constants
const FRAME_SIZE = 280;
const FRAME_RADIUS = 24;
const FRAME_TOP = SCREEN_HEIGHT * 0.22;
const FRAME_LEFT = (SCREEN_WIDTH - FRAME_SIZE) / 2;
const FRAME_BOTTOM = FRAME_TOP + FRAME_SIZE;

// Filtros rápidos de data
const FILTROS_DATA = [
  { id: 'todos', label: 'Todos', dias: null },
  { id: '7dias', label: '7 Dias', dias: 7 },
  { id: '30dias', label: '30 Dias', dias: 30 },
  { id: 'mes', label: 'Este Mês', dias: 'mes' },
];

// Ícones de categoria - Agora vem do banco, mas mantemos fallback
const getCategoryIcon = (categoria) => categoria?.icone || '📦';

// ============================================================================
// COMPONENTE SEARCHINPUT - Estado local para evitar perda de foco
// ============================================================================
const SearchInput = React.memo(({ onSearch, onClear, placeholder }) => {
  const [localValue, setLocalValue] = useState('');

  const handleSubmit = () => {
    if (localValue.trim().length >= 2) {
      onSearch(localValue.trim());
    }
  };

  const handleClear = () => {
    setLocalValue('');
    onClear();
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1b2e2b',
      marginHorizontal: 16,
      marginVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 14,
      height: 44,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}>
      <Feather name="search" size={18} color="#888" style={{ marginRight: 10 }} />
      <TextInput
        style={{
          flex: 1,
          fontSize: 14,
          color: '#f0f0f0',
          fontWeight: '500',
        }}
        placeholder={placeholder || "Buscar..."}
        placeholderTextColor="#888"
        value={localValue}
        onChangeText={setLocalValue}
        onSubmitEditing={handleSubmit}
        returnKeyType="search"
        autoCorrect={false}
        blurOnSubmit={false}
      />
      {localValue.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={{ padding: 6 }}>
          <Feather name="x" size={18} color="#888" />
        </TouchableOpacity>
      )}
    </View>
  );
});

export default function App() {
  // Carregar fontes Nunito
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
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

  // Estados - Navegação
  const [activeTab, setActiveTab] = useState('reports'); // 'history', 'scan', 'reports'

  // Estados - Histórico
  const [notas, setNotas] = useState([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [selectedNota, setSelectedNota] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [modoBusca, setModoBusca] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState('notes'); // 'notes' or 'products'
  const [isSearching, setIsSearching] = useState(false); // Indicador de busca em andamento

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
  // const [showDashboard, setShowDashboard] = useState(true); // Substituído por activeTab
  const [dashboardData, setDashboardData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [fornecedoresData, setFornecedoresData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardFiltro, setDashboardFiltro] = useState('ano'); // Filtro padrão: Este Ano
  const [showFilterModal, setShowFilterModal] = useState(false); // Modal de filtro dropdown
  const [showDrillDownModal, setShowDrillDownModal] = useState(false); // Modal drill-down
  const [drillDownData, setDrillDownData] = useState(null); // Dados do drill-down (itens)
  const [drillDownType, setDrillDownType] = useState(null); // 'categoria' ou 'fornecedor'
  const [loadingDrillDown, setLoadingDrillDown] = useState(false);

  // Estados - Lançamento Manual
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEstabelecimento, setManualEstabelecimento] = useState('');
  const [manualItens, setManualItens] = useState([]);
  const [manualItemNome, setManualItemNome] = useState('');
  const [manualItemQtd, setManualItemQtd] = useState('1');
  const [manualItemValor, setManualItemValor] = useState('');
  const [manualItemCategoria, setManualItemCategoria] = useState(null);
  const [savingManual, setSavingManual] = useState(false);

  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Animação de pulso para o frame
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const frameScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

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
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const url = `${API_URL}/itens/busca?q=${encodeURIComponent(termo.trim())}`;
      const response = await axios.get(url, { timeout: 10000 });
      const itens = response.data.itens || [];
      setProdutos(itens);
      setModoBusca(true);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProdutos([]);
    } finally {
      setIsSearching(false);
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

  // Salvar lançamento manual
  const saveManualEntry = useCallback(async () => {
    if (manualItens.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um item');
      return;
    }

    setSavingManual(true);

    try {
      const payload = {
        estabelecimento: manualEstabelecimento || 'Lançamento Manual',
        data_emissao: new Date().toISOString().split('T')[0],
        itens: manualItens.map(item => ({
          nome: item.nome,
          qtd: item.qtd,
          valor: item.valor,
          categoria_id: item.categoria_id
        }))
      };

      const response = await axios.post(`${API_URL}/notas/manual`, payload);

      if (response.data.success) {
        Alert.alert(
          'Sucesso! ✅',
          `Lançamento criado com ${response.data.num_itens} item(s)\nTotal: R$ ${response.data.total.toFixed(2)}`,
          [{
            text: 'OK', onPress: () => {
              // Resetar formulário
              setManualEstabelecimento('');
              setManualItens([]);
              setManualItemNome('');
              setManualItemQtd('1');
              setManualItemValor('');
              setManualItemCategoria(null);
              setShowManualEntry(false);
              // Atualizar lista de notas
              fetchNotas('', filtroAtivo);
            }
          }]
        );
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Alert.alert('Erro', 'Falha ao salvar lançamento: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSavingManual(false);
    }
  }, [manualEstabelecimento, manualItens, filtroAtivo, fetchNotas]);

  // Adicionar item ao lançamento manual
  const addManualItem = () => {
    if (!manualItemNome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do produto');
      return;
    }
    if (!manualItemValor || parseFloat(manualItemValor.replace(',', '.')) <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido');
      return;
    }
    if (!manualItemCategoria) {
      Alert.alert('Atenção', 'Selecione uma categoria');
      return;
    }

    const novoItem = {
      id: Date.now(),
      nome: manualItemNome.trim().toUpperCase(),
      qtd: parseFloat(manualItemQtd.replace(',', '.')) || 1,
      valor: parseFloat(manualItemValor.replace(',', '.')),
      categoria_id: manualItemCategoria.id,
      categoria: manualItemCategoria
    };

    setManualItens([...manualItens, novoItem]);
    setManualItemNome('');
    setManualItemQtd('1');
    setManualItemValor('');
    setManualItemCategoria(null);
  };

  // Remover item do lançamento manual
  const removeManualItem = (itemId) => {
    setManualItens(manualItens.filter(i => i.id !== itemId));
  };


  // Helper: Calcula datas baseado no filtro selecionado
  const getDashboardDates = () => {
    const hoje = new Date();
    let dataInicio, dataFim;

    if (dashboardFiltro === 'mes') {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    } else if (dashboardFiltro === 'mesPassado') {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    } else if (dashboardFiltro === '3meses') {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    } else if (dashboardFiltro === 'ano') {
      dataInicio = new Date(hoje.getFullYear(), 0, 1);
      dataFim = new Date(hoje.getFullYear() + 1, 0, 1);
    } else {
      // Default: este mês
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    }

    return {
      dataInicio: dataInicio.toISOString().split('T')[0],
      dataFim: dataFim.toISOString().split('T')[0]
    };
  };

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

      // Buscar todos os dados em paralelo
      const [categoriasRes, statsRes, fornecedoresRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/resumo?data_inicio=${inicio}&data_fim=${fim}`),
        axios.get(`${API_URL}/dashboard/estatisticas?data_inicio=${inicio}&data_fim=${fim}`),
        axios.get(`${API_URL}/dashboard/fornecedores?data_inicio=${inicio}&data_fim=${fim}&limit=5`),
      ]);

      setDashboardData(categoriasRes.data);
      setStatsData(statsRes.data);
      setFornecedoresData(fornecedoresRes.data);
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  // Carregar notas e categorias quando abrir histórico ou scan
  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'scan') {
      fetchNotas(busca, filtroAtivo);
      fetchCategorias();
    }
    // Resetar scanner quando voltar para aba scan (garante que sempre pode ler)
    if (activeTab === 'scan' && !modalVisible) {
      setScanned(false);
    }
  }, [activeTab]);

  // Carregar dashboard quando abrir
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchDashboard(dashboardFiltro);
    }
  }, [activeTab, dashboardFiltro]);

  // ===== BUSCA MANUAL - Executada ao pressionar Enter/Submit =====
  // (Debounce removido pois causava problemas de foco no teclado)

  // Tela de carregamento enquanto fontes carregam
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textSecondary, marginTop: 16, fontFamily: FONTS.semiBold }}>
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
          Precisamos da sua permissão para usar a câmera e escanear as notas fiscais.
        </Text>
        <GradientButton title="Permitir Câmera" onPress={requestPermission} />
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

  // Drill-down: Clique em categoria para ver produtos
  const handleCategoryDrillDown = async (categoria) => {
    setLoadingDrillDown(true);
    setDrillDownType('categoria');
    setShowDrillDownModal(true);

    try {
      const { dataInicio, dataFim } = getDashboardDates();
      const url = `${API_URL}/itens/categoria/${categoria.id}?data_inicio=${dataInicio}&data_fim=${dataFim}`;
      const response = await axios.get(url);
      setDrillDownData(response.data);
    } catch (error) {
      console.error('Erro ao buscar itens por categoria:', error);
      Alert.alert('Erro', 'Não foi possível carregar os itens');
      setShowDrillDownModal(false);
    } finally {
      setLoadingDrillDown(false);
    }
  };

  // Drill-down: Clique em fornecedor para ver produtos
  const handleVendorDrillDown = async (estabelecimento) => {
    setLoadingDrillDown(true);
    setDrillDownType('fornecedor');
    setShowDrillDownModal(true);

    try {
      const { dataInicio, dataFim } = getDashboardDates();
      const url = `${API_URL}/itens/fornecedor?estabelecimento=${encodeURIComponent(estabelecimento)}&data_inicio=${dataInicio}&data_fim=${dataFim}`;
      const response = await axios.get(url);
      setDrillDownData(response.data);
    } catch (error) {
      console.error('Erro ao buscar itens por fornecedor:', error);
      Alert.alert('Erro', 'Não foi possível carregar os itens');
      setShowDrillDownModal(false);
    } finally {
      setLoadingDrillDown(false);
    }
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

      // Atualizar item localmente - Scan Recente (nfceData)
      if (nfceData) {
        const itensAtualizados = nfceData.itens.map(item =>
          item.id === selectedItemForCategory.id
            ? { ...item, categoria: categorias.find(c => c.id === categoriaId) }
            : item
        );
        setNfceData({ ...nfceData, itens: itensAtualizados });
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
      // Em caso de erro, resetar para permitir nova leitura após 2s
      setTimeout(() => setScanned(false), 2000);
    } finally {
      setIsLoading(false);
      // Se deu erro/exception, resetar para permitir nova leitura
      // Se sucesso, o reset acontece quando fechar o modal ("Nova Leitura")
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
      onPress={() => handleItemLongPress(item)} // Clique normal agora abre modal
      activeOpacity={0.7}
    >
      <View style={{ alignItems: 'center', marginRight: SIZES.sm }}>
        <Text style={styles.itemIcon}>{getCategoryIcon(item.categoria)}</Text>
        {/* Indicador visual de edição */}
        <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.surface, borderRadius: 8 }}>
          <Text style={{ fontSize: 10 }}>✏️</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.itemName} numberOfLines={2}>{item.nome}</Text>
        <Text style={styles.itemQtd}>{item.qtd}x</Text>
      </View>

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

  // ===== TELA DE DASHBOARD (ANALYTICS) =====
  const DashboardScreen = () => {
    const screenWidth = Dimensions.get('window').width;
    const barColors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.success, '#9CA3AF'];

    // Pegar top 5 categorias
    const topCategorias = dashboardData?.categorias?.slice(0, 5) || [];
    const maxCatValue = topCategorias[0]?.total || 1;

    return (
      <SafeAreaView style={styles.dashboardContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

        {/* Header Clean Style */}
        <View style={styles.dashHeaderClean}>
          <Text style={styles.dashTitleClean}>Análise de Gastos</Text>
          <TouchableOpacity
            style={styles.dashQrButton}
            onPress={() => setActiveTab('scan')}
          >
            <Feather name="maximize" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips Horizontal */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dashFilterScroll}
          contentContainerStyle={styles.dashFilterContent}
        >
          {[
            { id: 'mes', label: 'Este Mês' },
            { id: 'mesPassado', label: 'Mês Passado' },
            { id: '3meses', label: '3 Meses' },
            { id: 'ano', label: 'Este Ano' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.dashFilterChip,
                dashboardFiltro === f.id && styles.dashFilterChipActive
              ]}
              onPress={() => setDashboardFiltro(f.id)}
            >
              <Text style={[
                styles.dashFilterChipText,
                dashboardFiltro === f.id && styles.dashFilterChipTextActive
              ]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={{ paddingBottom: SIZES.xl, flexGrow: 1 }}>
          {loadingDashboard ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <LottieAnimation name="loading" size={100} />
              <Text style={styles.loadingText}>Carregando análise...</Text>
            </View>
          ) : statsData ? (
            <>
              {/* ===== KPIs GRID (2x2) ===== */}
              <View style={styles.kpiGrid}>
                {/* Total Gasto */}
                <View style={[styles.kpiCardNew, { borderColor: COLORS.primary }]}>
                  <KPIIcon name="money" size={40} />
                  <Text style={styles.kpiLabelNew}>Total Gasto</Text>
                  <Text style={[styles.kpiValueNew, { color: COLORS.primary }]}>
                    R$ {statsData.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                {/* Média por Dia */}
                <View style={[styles.kpiCardNew, { borderColor: COLORS.accent }]}>
                  <KPIIcon name="chart" size={40} />
                  <Text style={styles.kpiLabelNew}>Média/Dia</Text>
                  <Text style={[styles.kpiValueNew, { color: COLORS.accent }]}>
                    R$ {statsData.media_dia?.toFixed(2)}
                  </Text>
                </View>

                {/* Total de Notas */}
                <View style={[styles.kpiCardNew, { borderColor: COLORS.success }]}>
                  <KPIIcon name="receipt" size={40} />
                  <Text style={styles.kpiLabelNew}>Compras</Text>
                  <Text style={[styles.kpiValueNew, { color: COLORS.success }]}>
                    {statsData.num_notas}
                  </Text>
                </View>

                {/* Ticket Médio */}
                <View style={[styles.kpiCardNew, { borderColor: COLORS.secondary }]}>
                  <KPIIcon name="store" size={40} />
                  <Text style={styles.kpiLabelNew}>Ticket Médio</Text>
                  <Text style={[styles.kpiValueNew, { color: COLORS.secondary }]}>
                    R$ {statsData.ticket_medio?.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* ===== PIE CHART CIRCULAR ===== */}
              <View style={styles.pieChartSection}>
                <View style={styles.pieChartContainer}>
                  <View style={styles.pieChartOuter}>
                    <View style={styles.pieChartInner}>
                      <Text style={styles.pieTopLabel}>Top Cat.</Text>
                      <Text style={styles.pieTopValue}>{topCategorias[0]?.nome || 'Sem dados'}</Text>
                    </View>
                  </View>

                  {/* Legend */}
                  <View style={styles.pieLegend}>
                    {topCategorias.slice(0, 4).map((cat, index) => (
                      <View key={cat.id} style={styles.pieLegendItem}>
                        <View style={[styles.pieLegendDot, { backgroundColor: barColors[index % barColors.length] }]} />
                        <Text style={styles.pieLegendText}>{cat.nome}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* ===== CATEGORIAS COM PROGRESS BARS ===== */}
              <View style={styles.analyticSection}>
                <View style={styles.categoriesHeader}>
                  <Text style={styles.analyticSectionTitleClean}>Categorias</Text>
                  <TouchableOpacity>
                    <Text style={styles.viewAllLink}>Ver todas</Text>
                  </TouchableOpacity>
                </View>

                {topCategorias.map((cat, index) => {
                  const percentage = statsData?.total > 0
                    ? Math.round((cat.total / statsData.total) * 100)
                    : 0;
                  const catColor = barColors[index % barColors.length];

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.categoryCardNew}
                      onPress={() => handleCategoryDrillDown(cat)}
                      activeOpacity={0.95}
                    >
                      <View style={styles.categoryCardContent}>
                        {/* Icon Circle */}
                        <View style={[styles.categoryIconCircle, { backgroundColor: catColor + '20' }]}>
                          <CategoryIcon category={cat.nome} size={24} color={catColor} />
                        </View>

                        {/* Info + Progress */}
                        <View style={styles.categoryCardInfo}>
                          <View style={styles.categoryCardRow}>
                            <Text style={styles.categoryCardName}>{cat.nome}</Text>
                            <Text style={styles.categoryCardValue}>R$ {cat.total.toFixed(2)}</Text>
                          </View>

                          {/* Progress Bar */}
                          <View style={styles.categoryProgressBg}>
                            <View
                              style={[
                                styles.categoryProgressFill,
                                { width: `${percentage}%`, backgroundColor: catColor }
                              ]}
                            />
                          </View>

                          <Text style={styles.categoryPercentText}>{percentage}% do orçamento</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ===== GASTOS POR FORNECEDOR ===== */}
              {fornecedoresData?.fornecedores?.length > 0 && (
                <View style={styles.analyticSection}>
                  <Text style={styles.analyticSectionTitle}>🏪 Top Fornecedores</Text>

                  {fornecedoresData.fornecedores.map((fornec, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.fornecedorRow}
                      onPress={() => handleVendorDrillDown(fornec.nome)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.fornecedorRank}>
                        <Text style={styles.fornecedorRankText}>{index + 1}º</Text>
                      </View>
                      <View style={styles.fornecedorInfo}>
                        <Text style={styles.fornecedorNome} numberOfLines={1}>{fornec.nome}</Text>
                        <Text style={styles.fornecedorCompras}>{fornec.num_compras} compra(s)</Text>
                      </View>
                      <View style={styles.fornecedorValor}>
                        <Text style={styles.fornecedorTotal}>R$ {fornec.total.toFixed(2)}</Text>
                        <Text style={styles.fornecedorPercent}>{fornec.porcentagem}%</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ===== COMPARATIVO ===== */}
              {statsData?.comparativo && (
                <View style={styles.analyticSection}>
                  <Text style={styles.analyticSectionTitle}>📈 Comparativo</Text>
                  <View style={styles.comparativoCard}>
                    <View style={styles.comparativoRow}>
                      <Text style={styles.comparativoLabel}>Período anterior:</Text>
                      <Text style={styles.comparativoValue}>
                        R$ {statsData.comparativo.total_anterior?.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.comparativoRow}>
                      <Text style={styles.comparativoLabel}>Variação:</Text>
                      <Text style={[
                        styles.comparativoVariacao,
                        { color: statsData.comparativo.tendencia === 'alta' ? COLORS.danger : COLORS.success }
                      ]}>
                        {statsData.comparativo.tendencia === 'alta' ? '+' : ''}{statsData.comparativo.variacao_percentual}%
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <LottieAnimation name="empty" size={120} loop={false} />
              <Text style={styles.emptyText}>Nenhum dado encontrado</Text>
            </View>
          )}
        </ScrollView>

        {/* Modal de Filtro */}
        <Modal
          visible={showFilterModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            style={styles.filterModalOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          >
            <View style={styles.filterModalContent}>
              <Text style={styles.filterModalTitle}>Selecione o período</Text>
              {[
                { id: 'mes', label: 'Este Mês', icon: '📅' },
                { id: 'mesPassado', label: 'Mês Passado', icon: '⏮️' },
                { id: '3meses', label: 'Últimos 3 Meses', icon: '📊' },
                { id: 'ano', label: 'Este Ano', icon: '📆' },
              ].map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.filterModalOption,
                    dashboardFiltro === f.id && styles.filterModalOptionActive
                  ]}
                  onPress={() => {
                    setDashboardFiltro(f.id);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={styles.filterModalOptionIcon}>{f.icon}</Text>
                  <Text style={[
                    styles.filterModalOptionText,
                    dashboardFiltro === f.id && styles.filterModalOptionTextActive
                  ]}>
                    {f.label}
                  </Text>
                  {dashboardFiltro === f.id && (
                    <Feather name="check" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modal de Drill-Down (Itens por Categoria/Fornecedor) */}
        <Modal
          visible={showDrillDownModal}
          animationType="slide"
          onRequestClose={() => setShowDrillDownModal(false)}
        >
          <SafeAreaView style={styles.drillDownContainer}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.drillDownHeader}>
              <TouchableOpacity
                style={styles.drillDownBackButton}
                onPress={() => setShowDrillDownModal(false)}
              >
                <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <View style={styles.drillDownTitleContainer}>
                <Text style={styles.drillDownTitle}>
                  {drillDownType === 'categoria' && drillDownData?.categoria ? (
                    `${drillDownData.categoria.icone} ${drillDownData.categoria.nome}`
                  ) : drillDownType === 'fornecedor' && drillDownData?.estabelecimento ? (
                    `🏪 ${drillDownData.estabelecimento}`
                  ) : 'Carregando...'}
                </Text>
                {drillDownData && (
                  <Text style={styles.drillDownSubtitle}>
                    {drillDownData.total_itens} itens • R$ {drillDownData.total_valor?.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>

            {/* Lista de Itens */}
            {loadingDrillDown ? (
              <View style={styles.drillDownLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando itens...</Text>
              </View>
            ) : drillDownData?.itens?.length > 0 ? (
              <FlatList
                data={drillDownData.itens}
                keyExtractor={(item, index) => `${item.item_id}-${index}`}
                contentContainerStyle={{ padding: SIZES.padding }}
                renderItem={({ item }) => (
                  <View style={styles.drillDownItem}>
                    <View style={styles.drillDownItemLeft}>
                      <Text style={styles.drillDownItemName} numberOfLines={2}>
                        {item.produto}
                      </Text>
                      <Text style={styles.drillDownItemMeta}>
                        {drillDownType === 'categoria' ? item.estabelecimento : (
                          `${item.categoria_icone || '📦'} ${item.categoria || 'Outros'}`
                        )}
                      </Text>
                      <Text style={styles.drillDownItemDate}>
                        {item.data_emissao ? new Date(item.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                      </Text>
                    </View>
                    <View style={styles.drillDownItemRight}>
                      <Text style={styles.drillDownItemValue}>
                        R$ {item.valor?.toFixed(2)}
                      </Text>
                      <Text style={styles.drillDownItemQtd}>
                        x{item.qtd}
                      </Text>
                    </View>
                  </View>
                )}
              />
            ) : (
              <View style={styles.drillDownEmpty}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>Nenhum item encontrado</Text>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // ===== TELA DE HISTÓRICO (REDESIGNED) =====
  const HistoryScreen = () => {
    // Helper: ícone e cor baseado no tipo de estabelecimento
    const getStoreStyle = (nome) => {
      const n = nome?.toLowerCase() || '';
      if (n.includes('mercado') || n.includes('market') || n.includes('atacado'))
        return { icon: 'shopping-cart', bg: '#dcfce7', color: '#16a34a' };
      if (n.includes('posto') || n.includes('shell') || n.includes('ipiranga') || n.includes('petrobras'))
        return { icon: 'droplet', bg: '#dbeafe', color: '#2563eb' };
      if (n.includes('restaurante') || n.includes('burger') || n.includes('lanchonete') || n.includes('mcdonald'))
        return { icon: 'coffee', bg: '#ffedd5', color: '#ea580c' };
      if (n.includes('farmacia') || n.includes('droga'))
        return { icon: 'heart', bg: '#fce7f3', color: '#db2777' };
      if (n.includes('loja') || n.includes('store') || n.includes('magazine'))
        return { icon: 'shopping-bag', bg: '#f3e8ff', color: '#9333ea' };
      return { icon: 'tag', bg: '#e0f2fe', color: '#0284c7' };
    };

    // Render card de nota (novo design)
    const renderNotaCard = ({ item }) => {
      const style = getStoreStyle(item.estabelecimento);
      const dataFormatada = item.data_emissao
        ? new Date(item.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        : '';
      const numItens = item.itens?.length || item.num_itens || 0;

      // Formatar nome: apenas 2 primeiras palavras em MAIÚSCULA
      const nomeFormatado = item.estabelecimento
        ? item.estabelecimento.split(' ').slice(0, 2).join(' ').toUpperCase()
        : '';

      return (
        <TouchableOpacity
          style={styles.transactionCard}
          onPress={() => openNotaDetail(item)}
          activeOpacity={0.95}
        >
          <View style={styles.transactionContent}>
            <View style={[styles.transactionIcon, { backgroundColor: style.bg }]}>
              <Feather name={style.icon} size={22} color={style.color} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionName} numberOfLines={1}>{nomeFormatado}</Text>
              <Text style={styles.transactionMeta}>{dataFormatada} • {numItens} itens</Text>
            </View>
            <View style={styles.transactionValue}>
              <Text style={styles.transactionAmount}>R$ {item.total?.toFixed(2)}</Text>
              <View style={styles.transactionBadge}>
                <View style={[styles.badgeDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.badgeText}>SCAN</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    };

    // Render card de produto (modo busca)
    const renderProductCard = ({ item }) => (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => openNotaFromProduto(item.nota_id)}
        activeOpacity={0.95}
      >
        <View style={styles.transactionContent}>
          <View style={[styles.transactionIcon, { backgroundColor: '#f0fdf4' }]}>
            <Text style={{ fontSize: 20 }}>{item.categoria?.icone || '📦'}</Text>
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionName} numberOfLines={1}>{item.produto}</Text>
            <Text style={styles.transactionMeta}>{item.estabelecimento}</Text>
          </View>
          <View style={styles.transactionValue}>
            <Text style={styles.transactionAmount}>R$ {item.valor_unitario?.toFixed(2)}</Text>
            <Text style={styles.productQty}>x{item.qtd}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );

    return (
      <SafeAreaView style={styles.historyContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

        {/* Header - Title Left, Segmented Right */}
        <View style={styles.historyHeaderNew}>
          <Text style={styles.historyTitleNew}>Histórico</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Botão Lançamento Manual */}
            <TouchableOpacity
              onPress={() => { fetchCategorias(); setShowManualEntry(true); }}
              style={{ padding: 8, backgroundColor: 'rgba(26,188,156,0.15)', borderRadius: 8 }}
            >
              <Feather name="edit-3" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.segmentedControlNew}>
              <TouchableOpacity
                style={[styles.segmentBtnNew, historyViewMode === 'notes' && styles.segmentBtnActiveNew]}
                onPress={() => { setHistoryViewMode('notes'); setModoBusca(false); setBusca(''); }}
              >
                <Text style={[styles.segmentTxtNew, historyViewMode === 'notes' && styles.segmentTxtActiveNew]}>
                  Notas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtnNew, historyViewMode === 'products' && styles.segmentBtnActiveNew]}
                onPress={() => { setHistoryViewMode('products'); setModoBusca(true); }}
              >
                <Text style={[styles.segmentTxtNew, historyViewMode === 'products' && styles.segmentTxtActiveNew]}>
                  Produtos
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search Bar Contextual - busca notas ou produtos */}
        <SearchInput
          placeholder={historyViewMode === 'notes' ? "Buscar estabelecimento..." : "Buscar produtos..."}
          onSearch={(termo) => {
            if (historyViewMode === 'notes') {
              // Buscar notas pelo nome do estabelecimento
              fetchNotas(termo, filtroAtivo);
            } else {
              // Buscar produtos pelo nome
              fetchProdutos(termo);
            }
          }}
          onClear={() => {
            if (historyViewMode === 'notes') {
              fetchNotas('', filtroAtivo);
            } else {
              setModoBusca(false);
              setProdutos([]);
            }
          }}
        />

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipsContainer}
          contentContainerStyle={styles.filterChipsContent}
        >
          {FILTROS_DATA.map((filtro) => (
            <TouchableOpacity
              key={filtro.id}
              style={[styles.filterChip, filtroAtivo === filtro.id && styles.filterChipActive]}
              onPress={() => handleFiltroChange(filtro.id)}
            >
              <Text style={[styles.filterChipText, filtroAtivo === filtro.id && styles.filterChipTextActive]}>
                {filtro.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Meta Text */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {modoBusca ? `${produtos.length} produto(s)` : `${notas.length} transações`}
          </Text>
        </View>

        {/* Lista de Transações */}
        {loadingNotas ? (
          <SkeletonList count={5} />
        ) : historyViewMode === 'products' || modoBusca ? (
          <FlatList
            data={produtos}
            renderItem={renderProductCard}
            keyExtractor={(item, index) => `produto-${item.item_id}-${index}`}
            contentContainerStyle={styles.transactionsList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <EmptyState
                icon="🔍"
                title="Busque um produto"
                message="Digite o nome do produto para comparar preços"
              />
            }
          />
        ) : (
          <FlatList
            data={notas}
            renderItem={renderNotaCard}
            keyExtractor={(item, index) => `nota-${index}`}
            contentContainerStyle={styles.transactionsList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <EmptyState
                icon="📭"
                title="Nenhuma nota ainda"
                message="Escaneie sua primeira nota fiscal"
                buttonTitle="Escanear Agora"
                onButtonPress={() => setActiveTab('scan')}
              />
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

        {/* Modal de Seleção de Categoria (Premium) */}
        <FriendlyModal
          visible={showCategoryModal}
          onClose={() => { setShowCategoryModal(false); setCreateCategoryMode(false); }}
          title={createCategoryMode ? "➕ Nova Categoria" : "🏷️ Escolha a Categoria"}
        >
          {createCategoryMode ? (
            // ====== MODO CRIAR CATEGORIA ======
            <>
              <Text style={styles.modalSubtitleSmall}>
                Use o teclado de emojis do seu celular
              </Text>

              <Input
                label="Nome da categoria"
                placeholder="Ex: Pets, Lazer, Saúde..."
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                icon="📝"
              />

              <Input
                label="Emoji"
                placeholder="🐕"
                value={newCategoryIcon}
                onChangeText={setNewCategoryIcon}
                maxLength={4}
                inputStyle={{ fontSize: 24, textAlign: 'center' }}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setCreateCategoryMode(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>← Voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonPrimary}
                  onPress={createNewCategory}
                >
                  <Text style={styles.modalButtonPrimaryText}>Criar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // ====== MODO LISTAR CATEGORIAS (Grid) ======
            <>
              <Text style={styles.modalSubtitleSmall} numberOfLines={2}>
                Item: {selectedItemForCategory?.nome}
              </Text>

              <CategoryGrid
                categories={categorias}
                selectedId={selectedItemForCategory?.categoria?.id}
                onSelect={(catId) => updateItemCategory(catId)}
                onAddPress={() => setCreateCategoryMode(true)}
                columns={4}
              />
            </>
          )}
        </FriendlyModal>

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

  // ===== TELA DA CÂMERA (SCANNER) =====
  const ScanScreen = () => {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        {/* Câmera só ativa se for a aba scan E estiver focado - gerenciado p/ Parent, mas aqui reforça */}
        <CameraView
          style={styles.camera}
          facing={facing}
          enableTorch={flashEnabled}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned || modalVisible ? undefined : handleBarcodeScanned}
        >
          <View style={styles.cameraOverlay}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.cameraHeader}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={styles.cameraHeaderButton} onPress={toggleFlash}>
                  <Feather name={flashEnabled ? 'zap' : 'zap-off'} size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.frameContainer}>
                <View style={styles.frame} />
                <Text style={styles.instructionText}>Aponte para o QR Code da nota</Text>
              </View>

              {/* Footer vazio para balancear layout */}
              <View style={styles.cameraFooter} />
            </SafeAreaView>
          </View>
        </CameraView>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <LottieAnimation name="loading" size={100} />
            <Text style={styles.loadingText}>Processando nota...</Text>
          </View>
        )}

        {/* Error Modal */}
        <FriendlyModal visible={errorVisible} onClose={() => setErrorVisible(false)}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>⚠️</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <GradientButton title="Tentar Novamente" onPress={() => setErrorVisible(false)} />
          </View>
        </FriendlyModal>

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

            <GradientButton
              title="Nova Leitura"
              onPress={() => {
                setModalVisible(false);
                // Pequeno delay para evitar leitura instantânea do mesmo QR Code se ainda estiver na frente
                setTimeout(() => setScanned(false), 1000);
              }}
              style={{ margin: SIZES.padding }}
            />
          </SafeAreaView>
        </Modal>

        {/* Modal de Seleção de Categoria (Para edição após Scan) */}
        <FriendlyModal
          visible={showCategoryModal}
          onClose={() => { setShowCategoryModal(false); setCreateCategoryMode(false); }}
          title={createCategoryMode ? "➕ Nova Categoria" : "🏷️ Escolha a Categoria"}
        >
          {createCategoryMode ? (
            <>
              <Text style={styles.modalSubtitleSmall}>Use o teclado de emojis do seu celular</Text>
              <Input label="Nome da categoria" placeholder="Ex: Pets..." value={newCategoryName} onChangeText={setNewCategoryName} icon="📝" />
              <Input label="Emoji" placeholder="🐕" value={newCategoryIcon} onChangeText={setNewCategoryIcon} maxLength={4} inputStyle={{ fontSize: 24, textAlign: 'center' }} />
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setCreateCategoryMode(false)}><Text style={styles.modalButtonSecondaryText}>← Voltar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonPrimary} onPress={createNewCategory}><Text style={styles.modalButtonPrimaryText}>Criar</Text></TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.modalSubtitleSmall} numberOfLines={2}>Item: {selectedItemForCategory?.nome}</Text>
              <CategoryGrid
                categories={categorias}
                selectedId={selectedItemForCategory?.categoria?.id}
                onSelect={(catId) => updateItemCategory(catId)}
                onAddPress={() => setCreateCategoryMode(true)}
                columns={4}
              />
            </>
          )}
        </FriendlyModal>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Conteúdo Principal - Usamos display:none ao invés de desmontar para evitar flicker */}
      <View style={[{ flex: 1 }, activeTab !== 'reports' && { display: 'none' }]}>
        <DashboardScreen />
      </View>
      <View style={[{ flex: 1 }, activeTab !== 'history' && { display: 'none' }]}>
        <HistoryScreen />
      </View>
      <View style={[{ flex: 1 }, activeTab !== 'scan' && { display: 'none' }]}>
        <ScanScreen />
      </View>

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('history')}
        >
          <Feather name="clock" size={24} color={activeTab === 'history' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.navLabel, activeTab === 'history' && styles.navLabelActive]}>Histórico</Text>
        </TouchableOpacity>

        {/* Botão Central Destacado (Scanner) */}
        <View style={styles.scanButtonContainer}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setActiveTab('scan')}
            activeOpacity={0.9}
          >
            <View style={styles.scanButtonInner}>
              <Feather name="maximize" size={28} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('reports')}
        >
          <Feather name="bar-chart-2" size={24} color={activeTab === 'reports' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.navLabel, activeTab === 'reports' && styles.navLabelActive]}>Relatórios</Text>
        </TouchableOpacity>
      </View>

      {/* ============= MODAL DE LANÇAMENTO MANUAL ============= */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showManualEntry}
        onRequestClose={() => setShowManualEntry(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          {/* Header */}
          <View style={styles.manualEntryHeader}>
            <TouchableOpacity onPress={() => setShowManualEntry(false)} style={{ padding: 8 }}>
              <Feather name="x" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.manualEntryTitle}>Lançamento Manual</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Campo Estabelecimento */}
            <View style={styles.manualInputGroup}>
              <Text style={styles.manualLabel}>Estabelecimento (opcional)</Text>
              <TextInput
                style={styles.manualInput}
                placeholder="Ex: Feira, Padaria..."
                placeholderTextColor={COLORS.textMuted}
                value={manualEstabelecimento}
                onChangeText={setManualEstabelecimento}
              />
            </View>

            {/* Separador */}
            <View style={styles.manualSeparator}>
              <Text style={styles.manualSectionTitle}>➕ Adicionar Item</Text>
            </View>

            {/* Campos do Item */}
            <View style={styles.manualInputGroup}>
              <Text style={styles.manualLabel}>Nome do Produto *</Text>
              <TextInput
                style={styles.manualInput}
                placeholder="Ex: Pão francês, Coca-Cola..."
                placeholderTextColor={COLORS.textMuted}
                value={manualItemNome}
                onChangeText={setManualItemNome}
                autoCapitalize="characters"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.manualInputGroup, { flex: 1 }]}>
                <Text style={styles.manualLabel}>Qtd</Text>
                <TextInput
                  style={styles.manualInput}
                  placeholder="1"
                  placeholderTextColor={COLORS.textMuted}
                  value={manualItemQtd}
                  onChangeText={setManualItemQtd}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.manualInputGroup, { flex: 2 }]}>
                <Text style={styles.manualLabel}>Valor (R$) *</Text>
                <TextInput
                  style={styles.manualInput}
                  placeholder="0,00"
                  placeholderTextColor={COLORS.textMuted}
                  value={manualItemValor}
                  onChangeText={setManualItemValor}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Seletor de Categoria */}
            <View style={styles.manualInputGroup}>
              <Text style={styles.manualLabel}>Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {categorias.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.manualCategoryChip,
                      manualItemCategoria?.id === cat.id && styles.manualCategoryChipActive
                    ]}
                    onPress={() => setManualItemCategoria(cat)}
                  >
                    <Text style={{ fontSize: 18 }}>{cat.icone}</Text>
                    <Text style={[
                      styles.manualCategoryName,
                      manualItemCategoria?.id === cat.id && { color: COLORS.primary }
                    ]}>{cat.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Botão Adicionar Item */}
            <TouchableOpacity style={styles.manualAddButton} onPress={addManualItem}>
              <Feather name="plus-circle" size={20} color={COLORS.white} />
              <Text style={styles.manualAddButtonText}>Adicionar Item</Text>
            </TouchableOpacity>

            {/* Lista de Itens */}
            {manualItens.length > 0 && (
              <>
                <View style={styles.manualSeparator}>
                  <Text style={styles.manualSectionTitle}>📦 Itens ({manualItens.length})</Text>
                </View>

                {manualItens.map((item) => (
                  <View key={item.id} style={styles.manualItemCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 22, marginRight: 12 }}>{item.categoria?.icone || '📦'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.manualItemName}>{item.nome}</Text>
                        <Text style={styles.manualItemDetails}>{item.qtd}x • R$ {item.valor.toFixed(2)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => removeManualItem(item.id)}>
                      <Feather name="trash-2" size={18} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Total */}
                <View style={styles.manualTotalRow}>
                  <Text style={styles.manualTotalLabel}>TOTAL</Text>
                  <Text style={styles.manualTotalValue}>
                    R$ {manualItens.reduce((sum, i) => sum + (i.qtd * i.valor), 0).toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* Botão Salvar */}
          {manualItens.length > 0 && (
            <View style={styles.manualFooter}>
              <TouchableOpacity style={styles.manualSaveButton} onPress={saveManualEntry} disabled={savingManual}>
                {savingManual ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Feather name="check-circle" size={20} color={COLORS.white} />
                    <Text style={styles.manualSaveButtonText}>Salvar Lançamento</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 30,
  },
  permissionIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  permissionTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontFamily: FONTS.bold,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    marginBottom: 30,
  },

  // Camera Screen
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SIZES.padding,
  },
  cameraHeaderButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: SIZES.radiusFull,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderWidth: 4,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
  },
  instructionText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    marginTop: SIZES.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radius,
  },
  cameraFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SIZES.padding,
  },
  navButton: {
    alignItems: 'center',
  },
  navButtonText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    marginTop: SIZES.xs,
  },

  // Loading and Error
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 26, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    marginTop: 15,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    backgroundColor: COLORS.surfaceSolid,
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: FONTS.bold,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },
  cachedBadge: {
    color: COLORS.success,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    marginTop: 5,
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.sm,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSolid,
    padding: SIZES.md,
    marginVertical: SIZES.xs,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: SIZES.md,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  itemQtd: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginHorizontal: 10,
  },
  itemValor: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.success,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSolid,
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // History Screen
  historicoContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: SIZES.md,
  },
  backButton: {
    padding: SIZES.sm
  },
  searchContainer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.surface
  },
  searchInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
  },
  filtrosContainer: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface
  },
  filtroChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.background,
    marginRight: SIZES.sm,
  },
  filtroChipAtivo: {
    backgroundColor: COLORS.primary,
  },
  filtroText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  filtroTextAtivo: {
    color: COLORS.white,
  },
  notasList: {
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.sm
  },
  notaCard: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs
  },
  notaEstabelecimento: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  notaTotal: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  notaData: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  notaItens: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Dashboard Screen
  dashboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.padding,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    ...SHADOWS.md,
    marginHorizontal: SIZES.xs
  },
  kpiLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  kpiValue: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  chartContainer: {
    alignItems: 'center',
    marginHorizontal: SIZES.padding,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.sm,
    ...SHADOWS.md,
    marginBottom: SIZES.lg,
  },
  categoriesContainer: {
    paddingHorizontal: SIZES.padding
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.sm,
    ...SHADOWS.sm
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  categoryPercent: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: SIZES.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Modal de Categoria
  modalSubtitleSmall: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
    textAlign: 'center'
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginTop: SIZES.md,
  },
  modalButtonPrimary: {
    flex: 1,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    ...SHADOWS.sm
  },
  modalButtonSecondaryText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },

  // ========== PREMIUM STYLES ==========

  // Header Premium (Histórico e Dashboard)
  historicoHeaderPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dashboardHeaderPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.glass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  backButtonIcon: {
    fontSize: 20,
    color: COLORS.white,
  },
  historicoTitleLarge: {
    fontSize: SIZES.font2xl,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  dashboardTitleLarge: {
    fontSize: SIZES.font2xl,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },

  // Search Premium
  searchContainerPremium: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: SIZES.sm,
  },
  searchInputPremium: {
    flex: 1,
    paddingVertical: SIZES.sm + 4,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
  },

  // Filtros Premium
  filtrosContainerPremium: {
    backgroundColor: COLORS.background,
    paddingVertical: SIZES.md,
  },
  filtrosContentPremium: {
    paddingHorizontal: SIZES.padding,
    gap: SIZES.sm,
  },
  filtroChipPremium: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginRight: SIZES.sm,
  },
  filtroChipAtivoPremium: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filtroTextPremium: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  filtroTextAtivoPremium: {
    color: COLORS.white,
  },
  filtroInfoPremium: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.sm,
  },

  // ===== NEW HISTORY SCREEN STYLES =====
  historyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.sm,
  },
  historyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  // NEW: Header com título à esquerda e controls à direita
  historyHeaderNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  historyTitleNew: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  segmentedControlNew: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: SIZES.radius,
    padding: 4,
  },
  segmentBtnNew: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radius - 2,
  },
  segmentBtnActiveNew: {
    backgroundColor: COLORS.surfaceSolid,
  },
  segmentTxtNew: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  segmentTxtActiveNew: {
    color: COLORS.primary,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentedContainer: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: 4,
    height: 48,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.radius,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.surfaceSolid,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSolid,
    marginHorizontal: SIZES.padding,
    marginVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.radiusMd,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIconNew: {
    marginRight: SIZES.sm,
  },
  searchInputNew: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  filterChipsContainer: {
    paddingVertical: SIZES.sm,
  },
  filterChipsContent: {
    paddingHorizontal: SIZES.padding,
    paddingRight: 40,
    gap: 8,
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1b2e2b',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.md,
  },
  metaText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  metaLink: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  transactionsList: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 150,
    flexGrow: 1,
  },
  transactionCard: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  transactionValue: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  transactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  productQty: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  listEndText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    paddingVertical: SIZES.lg,
  },

  // Produto Cards (Busca)
  produtoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSolid,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderRadius: SIZES.radius,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  produtoIcon: {
    fontSize: 24,
    marginRight: SIZES.md,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  produtoMercado: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  produtoPreco: {
    alignItems: 'flex-end',
  },
  produtoValor: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.success,
  },
  produtoData: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Dashboard Premium
  dashboardFilterScroll: {
    marginBottom: SIZES.lg,
  },
  dashboardChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  dashboardChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dashboardChipText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  dashboardChipTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  kpiCardMain: {
    flex: 1,
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  kpiValueLarge: {
    fontSize: SIZES.font4xl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  kpiRowSmall: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
  },
  kpiCardSmall: {
    flex: 1,
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    alignItems: 'center',
  },
  kpiIconSmall: {
    fontSize: 24,
    marginBottom: SIZES.xs,
  },
  kpiLabelSmall: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  kpiValueSmall: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  chartContainerPremium: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
    alignItems: 'center',
  },
  categoryRowPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSolid,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.sm,
  },
  categoryTotal: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    marginTop: SIZES.xs,
  },
  categoryIcon: {
    fontSize: 20,
  },

  // Modal Detail Premium
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editButton: {
    padding: SIZES.sm,
  },
  editButtonText: {
    fontSize: 18,
  },
  modalEndereco: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  newScanButton: {
    backgroundColor: COLORS.glass,
    margin: SIZES.padding,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  newScanButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },

  // Rename Modal
  renameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  renameModalContent: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  renameModalTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  renameModalSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  renameInput: {
    backgroundColor: COLORS.glass,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  renameButtons: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  renameCancelButton: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  renameCancelText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  renameSaveButton: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  renameSaveText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },

  // Empty State
  emptyText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xl,
  },

  // ===== NOVOS ESTILOS DASHBOARD ANALÍTICO =====
  trendBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    marginLeft: SIZES.sm,
  },
  trendText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  // Filter Dropdown Styles
  filterDropdownContainer: {
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.md,
  },
  filterDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSolid,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SIZES.sm,
    alignSelf: 'flex-start',
  },
  filterDropdownText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  filterModalContent: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterModalTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  filterModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.xs,
  },
  filterModalOptionActive: {
    backgroundColor: COLORS.primary + '20',
  },
  filterModalOptionIcon: {
    fontSize: 20,
    marginRight: SIZES.md,
  },
  filterModalOptionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  filterModalOptionTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },

  // ===== DASHBOARD CLEAN DESIGN =====
  dashHeaderClean: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.sm,
    paddingBottom: SIZES.xs,
    backgroundColor: COLORS.background,
  },
  dashTitleClean: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  dashQrButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSolid,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dashFilterScroll: {
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.xs,
  },
  dashFilterContent: {
    flexDirection: 'row',
    gap: SIZES.sm,
    paddingRight: SIZES.padding,
  },
  dashFilterChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSolid,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dashFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dashFilterChipText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  dashFilterChipTextActive: {
    color: COLORS.white,
  },

  // ===== PIE CHART SECTION =====
  pieChartSection: {
    paddingHorizontal: SIZES.padding,
    marginVertical: SIZES.sm,
  },
  pieChartContainer: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pieChartOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pieChartInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.surfaceSolid,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  pieTopLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pieTopValue: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  pieLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: SIZES.lg,
    gap: SIZES.md,
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pieLegendText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },

  // ===== CATEGORIES HEADER =====
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  analyticSectionTitleClean: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  viewAllLink: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // ===== CATEGORY CARDS NEW =====
  categoryCardNew: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.md,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardInfo: {
    flex: 1,
  },
  categoryCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryCardName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  categoryCardValue: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  categoryProgressBg: {
    height: 8,
    backgroundColor: COLORS.glass,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryPercentText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },

  // Drill-Down Modal Styles
  drillDownContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  drillDownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drillDownBackButton: {
    padding: SIZES.sm,
    marginRight: SIZES.sm,
  },
  drillDownTitleContainer: {
    flex: 1,
  },
  drillDownTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  drillDownSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  drillDownLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drillDownEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drillDownItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSolid,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  drillDownItemLeft: {
    flex: 1,
  },
  drillDownItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  drillDownItemName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  drillDownItemMeta: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  drillDownItemDate: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  drillDownItemValue: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  drillDownItemQtd: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.padding,
    gap: SIZES.sm,
    marginTop: SIZES.xs,
  },
  kpiCardNew: {
    width: '47%', // Aproximadamente metade menos o gap
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    alignItems: 'center',
    borderWidth: 1,
    // borderColor será definido inline
  },
  kpiLabelNew: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  kpiValueNew: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  analyticSection: {
    marginTop: SIZES.xl,
    paddingHorizontal: SIZES.padding,
  },
  analyticSectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  // Gráfico de Barras Horizontais
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  barLabel: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabelText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    flex: 1,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    marginHorizontal: SIZES.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 70,
    textAlign: 'right',
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  // Lista de Fornecedores
  fornecedorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSolid,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fornecedorRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fornecedorRankText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  fornecedorInfo: {
    flex: 1,
  },
  fornecedorNome: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  fornecedorCompras: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  fornecedorValor: {
    alignItems: 'flex-end',
  },
  fornecedorTotal: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  fornecedorPercent: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  // Comparativo Card
  comparativoCard: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  comparativoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparativoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  comparativoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
  },
  comparativoVariacao: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  // ===== BOTTOM NAVIGATION =====
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSolid,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 20, // Padding para segurança em telas modernas
    paddingTop: 10,
    height: 85,
    alignItems: 'flex-start', // Alinha itens no topo, ajustado pelo padding
    justifyContent: 'space-around',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: 5,
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
    color: COLORS.textMuted,
    fontFamily: FONTS.semiBold,
  },
  navLabelActive: {
    color: COLORS.primary,
  },
  scanButtonContainer: {
    marginTop: -30, // Floating effect
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background, // Borda externa para separar do fundo
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  scanButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  // ===== MANUAL ENTRY STYLES =====
  manualEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  manualEntryTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  manualInputGroup: {
    marginBottom: 16,
  },
  manualLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  manualInput: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  manualSeparator: {
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  manualSectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  manualCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSolid,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  manualCategoryChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(26, 188, 156, 0.1)',
  },
  manualCategoryName: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  manualAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  manualAddButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginLeft: 8,
  },
  manualItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSolid,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  manualItemName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  manualItemDetails: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  manualTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(26, 188, 156, 0.1)',
    borderRadius: 12,
    marginTop: 8,
  },
  manualTotalLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  manualTotalValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  manualFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  manualSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
  },
  manualSaveButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginLeft: 8,
  },
});

