import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';

type State = {
  errorMessage: string;
};

type InnerProps = PropsWithChildren & {
  styles: ReturnType<typeof createStyles>;
};

class AppErrorBoundaryInner extends Component<InnerProps, State> {
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
    const { styles } = this.props;

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

export function AppErrorBoundary({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return <AppErrorBoundaryInner styles={styles}>{children}</AppErrorBoundaryInner>;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
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
}
