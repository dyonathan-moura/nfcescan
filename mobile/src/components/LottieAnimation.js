/**
 * LottieAnimation - Wrapper para animações Lottie
 * 
 * Componente reutilizável para animações em diferentes contextos.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

// Animações disponíveis
const ANIMATIONS = {
    loading: require('../../assets/animations/loading.json'),
    success: require('../../assets/animations/success.json'),
    error: require('../../assets/animations/error.json'),
    empty: require('../../assets/animations/empty.json'),
    scan: require('../../assets/animations/scan.json'),
};

export default function LottieAnimation({
    name,
    source,
    size = 120,
    autoPlay = true,
    loop = true,
    style,
    speed = 1,
}) {
    const animationSource = source || ANIMATIONS[name];

    if (!animationSource) {
        console.warn(`LottieAnimation: Animation "${name}" not found`);
        return null;
    }

    return (
        <View style={[styles.container, { width: size, height: size }, style]}>
            <LottieView
                source={animationSource}
                autoPlay={autoPlay}
                loop={loop}
                speed={speed}
                style={{ width: size, height: size }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
