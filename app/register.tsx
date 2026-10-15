
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  StatusBar,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please complete all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(
        email.trim(),
        password,
        {
          full_name: fullName.trim(),
          role,
        }
      );

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    if (error) setError(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 16,
                paddingBottom: Math.max(insets.bottom, 20) + 16,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* App Header */}
            <View style={styles.headerContainer}>
              <Header title="QR Attendance" />
            </View>

            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.title}>
                {success ? 'Almost There!' : 'Create Account'}
              </Text>

              <Text style={styles.subtitle}>
                {success
                  ? 'Verify your email to get started.'
                  : 'Join QR Attendance to manage your attendance easily.'}
              </Text>
            </View>

            {success ? (
              /* Registration Success */
              <View style={styles.successCard}>
                <View style={styles.successIcon}>
                  <Ionicons
                    name="mail-open-outline"
                    size={34}
                    color="#2E7D32"
                  />
                </View>

                <Text style={styles.successTitle}>
                  Check your email!
                </Text>

                <Text style={styles.successText}>
                  We sent a confirmation link to:
                </Text>

                <Text style={styles.successEmail}>
                  {email.trim()}
                </Text>

                <Text style={styles.successText}>
                  Open the email and click the confirmation link to verify
                  your account. Once verified, return here to sign in.
                </Text>

                <View style={styles.successButton}>
                  <AppButton
                    theme="primary"
                    title="Back to Sign In"
                    icon="log-in-outline"
                    onPress={() => router.replace('/login')}
                  />
                </View>
              </View>
            ) : (
              /* Registration Form */
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Your Details</Text>

                <Text style={styles.formSubtitle}>
                  Fill in the information below to register.
                </Text>

                {/* Full Name */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Full Name</Text>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={COLORS.textSecondary}
                    />

                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={(value) => {
                        setFullName(value);
                        clearError();
                      }}
                      placeholder="Enter your full name"
                      placeholderTextColor={COLORS.textSecondary}
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="name"
                      editable={!loading}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Account Role */}
                <Text style={styles.label}>I am a...</Text>

                <View style={styles.roleRow}>
                  <Pressable
                    disabled={loading}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: role === 'student' }}
                    onPress={() => setRole('student')}
                    style={({ pressed }) => [
                      styles.roleChip,
                      role === 'student' && styles.roleChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.roleIcon,
                        role === 'student' && styles.roleIconActive,
                      ]}
                    >
                      <Ionicons
                        name="school-outline"
                        size={22}
                        color={
                          role === 'student'
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.roleChipText,
                        role === 'student' && styles.roleChipTextActive,
                      ]}
                    >
                      Student
                    </Text>

                    {role === 'student' && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={COLORS.primary}
                      />
                    )}
                  </Pressable>

                  <Pressable
                    disabled={loading}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: role === 'teacher' }}
                    onPress={() => setRole('teacher')}
                    style={({ pressed }) => [
                      styles.roleChip,
                      role === 'teacher' && styles.roleChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.roleIcon,
                        role === 'teacher' && styles.roleIconActive,
                      ]}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={22}
                        color={
                          role === 'teacher'
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.roleChipText,
                        role === 'teacher' && styles.roleChipTextActive,
                      ]}
                    >
                      Teacher
                    </Text>

                    {role === 'teacher' && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={COLORS.primary}
                      />
                    )}
                  </Pressable>
                </View>

                {/* Email */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Email Address</Text>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={COLORS.textSecondary}
                    />

                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={(value) => {
                        setEmail(value);
                        clearError();
                      }}
                      placeholder="Enter your email"
                      placeholderTextColor={COLORS.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      autoComplete="email"
                      editable={!loading}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Password</Text>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={COLORS.textSecondary}
                    />

                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        clearError();
                      }}
                      placeholder="At least 6 characters"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      editable={!loading}
                      returnKeyType="next"
                    />

                    <Pressable
                      onPress={() =>
                        setShowPassword((current) => !current)
                      }
                      disabled={loading}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      <Ionicons
                        name={
                          showPassword
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={21}
                        color={COLORS.textSecondary}
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.helperText}>
                    Use at least 6 characters.
                  </Text>
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Confirm Password</Text>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={COLORS.textSecondary}
                    />

                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={(value) => {
                        setConfirmPassword(value);
                        clearError();
                      }}
                      placeholder="Re-enter your password"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="new-password"
                      editable={!loading}
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                    />

                    <Pressable
                      onPress={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      disabled={loading}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={21}
                        color={COLORS.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Error */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={19}
                      color={COLORS.danger}
                    />

                    <Text style={styles.error}>{error}</Text>
                  </View>
                )}

                {/* Register Button */}
                <View style={styles.buttonContainer}>
                  {loading ? (
                    <View style={styles.loadingButton}>
                      <ActivityIndicator
                        size="small"
                        color={COLORS.textOnPrimary}
                      />

                      <Text style={styles.loadingText}>
                        Creating account...
                      </Text>
                    </View>
                  ) : (
                    <AppButton
                      theme="primary"
                      title="Create Account"
                      icon="person-add-outline"
                      onPress={handleRegister}
                    />
                  )}
                </View>

                <View style={styles.securityNote}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />

                  <Text style={styles.securityText}>
                    Your account details are used for attendance access.
                  </Text>
                </View>
              </View>
            )}

            {/* Sign In Link */}
            {!success && (
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>
                  Already have an account?
                </Text>

                <Link href="/login" style={styles.loginLink}>
                  Sign In
                </Link>
              </View>
            )}

            <Text style={styles.footerText}>
              
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  headerContainer: {
    alignItems: 'center',
    marginBottom: 22,
  },

  welcomeSection: {
    alignItems: 'center',
    marginBottom: 22,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  formTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  formSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 18,
  },

  fieldContainer: {
    marginBottom: 15,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  inputWrapper: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    gap: 10,
  },

  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  helperText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 17,
  },

  roleChip: {
    flex: 1,
    minHeight: 75,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  roleChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '14',
  },

  roleIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },

  roleIconActive: {
    backgroundColor: COLORS.card,
  },

  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  roleChipTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.75,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    borderRadius: 11,
    padding: 11,
    gap: 8,
    marginBottom: 14,
  },

  error: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.danger,
  },

  buttonContainer: {
    marginTop: 5,
  },

  loadingButton: {
    minHeight: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },

  securityText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 20,
  },

  loginText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },

  successCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },

  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },

  successText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },

  successEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 14,
  },

  successButton: {
    width: '100%',
    marginTop: 8,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 18,
  },
});
