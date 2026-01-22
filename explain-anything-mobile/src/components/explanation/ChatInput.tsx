// src/components/explanation/ChatInput.tsx
import React, { useState, useRef } from 'react';
import {
    View,
    TextInput,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { theme } from '@/styles/theme';
import { HapticFeedback } from '@/utils/haptics';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ChatInput({
    onSend,
    disabled,
    placeholder = 'Ask a follow-up question...',
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const inputRef = useRef<TextInput>(null);
    const buttonScale = useSharedValue(1);

    const canSend = message.trim().length > 0 && !disabled;

    const handleSend = () => {
        if (!canSend) return;

        HapticFeedback.impact('light');
        onSend(message.trim());
        setMessage('');
        inputRef.current?.clear();
    };

    const handlePressIn = () => {
        if (!canSend) return;
        buttonScale.value = withSpring(0.9);
    };

    const handlePressOut = () => {
        buttonScale.value = withSpring(1);
    };

    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.container}>
                <View style={styles.inputContainer}>
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor={theme.colors.neutral[400]}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        maxLength={1000}
                        editable={!disabled}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                    />

                    <Pressable
                        onPress={handleSend}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        disabled={!canSend}
                        style={styles.buttonContainer}
                    >
                        <Animated.View
                            style={[
                                styles.button,
                                buttonStyle,
                                !canSend && styles.buttonDisabled,
                            ]}
                        >
                            <Ionicons
                                name="send"
                                size={20}
                                color={canSend ? '#fff' : theme.colors.neutral[400]}
                            />
                        </Animated.View>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: theme.colors.neutral[200],
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: theme.spacing.sm,
    },
    input: {
        flex: 1,
        backgroundColor: theme.colors.neutral[50],
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.neutral[900],
        maxHeight: 100,
    },
    buttonContainer: {
        marginBottom: 4,
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: theme.colors.neutral[200],
    },
});