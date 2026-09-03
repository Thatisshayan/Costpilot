import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Fonts, Spacing } from '@/constants/theme';

// Premium Card Component
interface PremiumCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'accent' | 'warning' | 'success';
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ children, style, variant = 'default' }) => {
  const variantStyles = {
    default: styles.cardDefault,
    accent: styles.cardAccent,
    warning: styles.cardWarning,
    success: styles.cardSuccess,
  };

  return (
    <View style={[styles.premiumCard, variantStyles[variant], style]}>
      {children}
    </View>
  );
};

// Premium Button Component
interface PremiumButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: string;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  icon,
}) => {
  const variantStyles = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    outline: styles.buttonOutline,
    danger: styles.buttonDanger,
  };

  const sizeStyles = {
    small: styles.buttonSmall,
    medium: styles.buttonMedium,
    large: styles.buttonLarge,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
      <Text style={[styles.buttonText, sizeStyles[size] === styles.buttonSmall && styles.buttonTextSmall]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// Premium Stat Component
interface PremiumStatProps {
  label: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
  icon?: string;
}

export const PremiumStat: React.FC<PremiumStatProps> = ({
  label,
  value,
  trend,
  trendPositive = true,
  icon,
}) => {
  return (
    <View style={styles.statContainer}>
      {icon && <Text style={styles.statIcon}>{icon}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { fontFamily: Fonts.clashDisplay }]}>{value}</Text>
      {trend && (
        <Text style={[styles.statTrend, trendPositive ? styles.trendPositive : styles.trendNegative]}>
          {trend}
        </Text>
      )}
    </View>
  );
};

// Premium Badge Component
interface PremiumBadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'small' | 'medium';
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  label,
  variant = 'default',
  size = 'medium',
}) => {
  const variantStyles = {
    default: styles.badgeDefault,
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
    info: styles.badgeInfo,
  };

  const sizeStyles = {
    small: styles.badgeSmall,
    medium: styles.badgeMedium,
  };

  return (
    <View style={[styles.badge, variantStyles[variant], sizeStyles[size]]}>
      <Text style={[styles.badgeText, sizeStyles[size] === styles.badgeSmall && styles.badgeTextSmall]}>
        {label}
      </Text>
    </View>
  );
};

// Premium Section Header Component
interface PremiumSectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: () => void;
  actionLabel?: string;
}

export const PremiumSectionHeader: React.FC<PremiumSectionHeaderProps> = ({
  title,
  subtitle,
  action,
  actionLabel,
}) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Text style={[styles.sectionTitle, { fontFamily: Fonts.clashDisplay }]}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {action && actionLabel && (
        <TouchableOpacity onPress={action} activeOpacity={0.7}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Premium Input Component
interface PremiumInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: string;
  error?: string;
}

export const PremiumInput: React.FC<PremiumInputProps> = ({
  placeholder,
  value,
  onChangeText,
  icon,
  error,
}) => {
  return (
    <View style={styles.inputContainer}>
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        {icon && <Text style={styles.inputIcon}>{icon}</Text>}
        <Text
          style={[styles.input, { color: value ? Colors.dark.text : Colors.dark.textSecondary }]}
          placeholder={placeholder}
          placeholderTextColor={Colors.dark.textSecondary}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// Premium Divider Component
interface PremiumDividerProps {
  variant?: 'default' | 'subtle';
  style?: ViewStyle;
}

export const PremiumDivider: React.FC<PremiumDividerProps> = ({
  variant = 'default',
  style,
}) => {
  const variantStyles = {
    default: styles.dividerDefault,
    subtle: styles.dividerSubtle,
  };

  return <View style={[styles.divider, variantStyles[variant], style]} />;
};

// Styles
const styles = StyleSheet.create({
  // Premium Card
  premiumCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing[4],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  cardDefault: {
    backgroundColor: Colors.dark.backgroundElement,
    borderColor: '#2E3135',
  },
  cardAccent: {
    backgroundColor: `${Colors.dark.accentAction}15`,
    borderColor: `${Colors.dark.accentAction}40`,
  },
  cardWarning: {
    backgroundColor: `${Colors.dark.accentWarning}15`,
    borderColor: `${Colors.dark.accentWarning}40`,
  },
  cardSuccess: {
    backgroundColor: `${Colors.dark.accentGCP}15`,
    borderColor: `${Colors.dark.accentGCP}40`,
  },

  // Premium Button
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonPrimary: {
    backgroundColor: Colors.dark.accentAI,
  },
  buttonSecondary: {
    backgroundColor: Colors.dark.accentAction,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.accentAction,
  },
  buttonDanger: {
    backgroundColor: Colors.dark.accentWarning,
  },
  buttonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 32,
  },
  buttonMedium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 40,
  },
  buttonLarge: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    height: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    fontSize: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.plusJakartaSans,
  },
  buttonTextSmall: {
    fontSize: 12,
  },

  // Premium Stat
  statContainer: {
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 24,
  },
  statLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.plusJakartaSans,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  statTrend: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.plusJakartaSans,
  },
  trendPositive: {
    color: Colors.dark.accentGCP,
  },
  trendNegative: {
    color: Colors.dark.accentWarning,
  },

  // Premium Badge
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeDefault: {
    backgroundColor: `${Colors.dark.accentAction}15`,
    borderColor: `${Colors.dark.accentAction}40`,
  },
  badgeSuccess: {
    backgroundColor: `${Colors.dark.accentGCP}15`,
    borderColor: `${Colors.dark.accentGCP}40`,
  },
  badgeWarning: {
    backgroundColor: `${Colors.dark.accentWarning}15`,
    borderColor: `${Colors.dark.accentWarning}40`,
  },
  badgeDanger: {
    backgroundColor: `${Colors.dark.accentWarning}15`,
    borderColor: `${Colors.dark.accentWarning}40`,
  },
  badgeInfo: {
    backgroundColor: `${Colors.dark.accentAI}15`,
    borderColor: `${Colors.dark.accentAI}40`,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: Colors.dark.accentAction,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.plusJakartaSans,
  },
  badgeTextSmall: {
    fontSize: 10,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.plusJakartaSans,
    marginTop: 4,
  },
  sectionAction: {
    color: Colors.dark.accentAction,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.plusJakartaSans,
  },

  // Input
  inputContainer: {
    marginBottom: Spacing[4],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E3135',
    paddingHorizontal: Spacing[3],
    height: 48,
  },
  inputError: {
    borderColor: Colors.dark.accentWarning,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    fontFamily: Fonts.plusJakartaSans,
  },
  errorText: {
    color: Colors.dark.accentWarning,
    fontSize: 11,
    fontFamily: Fonts.plusJakartaSans,
    marginTop: 4,
  },

  // Divider
  divider: {
    height: 1,
    marginVertical: Spacing[3],
  },
  dividerDefault: {
    backgroundColor: '#2E3135',
  },
  dividerSubtle: {
    backgroundColor: 'rgba(46, 49, 53, 0.5)',
  },
});

export default {
  PremiumCard,
  PremiumButton,
  PremiumStat,
  PremiumBadge,
  PremiumSectionHeader,
  PremiumInput,
  PremiumDivider,
};
