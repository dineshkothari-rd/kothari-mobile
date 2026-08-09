import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../design/tokens';

type State = {
  errorMessage: string;
};

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = {
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error) {
    return {
      errorMessage: error.message || 'Something went wrong.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App shell error', error, info.componentStack);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.title}>We could not open the workspace.</Text>
          <Text style={styles.message}>{this.state.errorMessage}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: typography.weight.black,
    textAlign: 'center',
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
