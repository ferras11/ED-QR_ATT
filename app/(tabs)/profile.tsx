
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setDraftName('');
      return;
    }

    try {
      const result = await getProfile(user.id);

      setProfile(result);
      setDraftName(result?.full_name ?? '');

      if (!result) {
        console.warn('Profile could not be loaded for:', user.id);
      }
    } catch (error) {
      console.error('Profile loading failed:', error);
      Alert.alert('Error', 'Unable to load your profile.');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // Normalize the role before displaying it.
  const role = String(profile?.role ?? '')
    .trim()
    .toLowerCase();

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  const roleLabel = isAdmin
    ? 'Admin'
    : isTeacher
      ? 'Teacher'
      : isStudent
        ? 'Student'
        : 'Unknown';

  const accountLabel = isAdmin
    ? 'Admin Account'
    : isTeacher
      ? 'Teacher Account'
      : isStudent
        ? 'Student Account'
        : 'Role Unavailable';

  const roleIcon: keyof typeof Ionicons.glyphMap = isAdmin
    ? 'shield-checkmark-outline'
    : isTeacher
      ? 'school-outline'
      : 'person-outline';

  const fullName = profile?.full_name || 'Add your full name';

  const initials = (profile?.full_name || user?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

  const handleSaveName = async () => {
    if (!user) return;

    const trimmedName = draftName.trim();

    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: trimmedName,
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setProfile((previous) =>
        previous
          ? { ...previous, full_name: trimmedName }
          : previous
      );

      setDraftName(trimmedName);
      setEditing(false);

      Alert.alert('Success', 'Your name has been updated.');
    } catch (error) {
      console.error('Updating profile failed:', error);
      Alert.alert('Error', 'Unable to update your name.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert(
        'Sign Out Failed',
        error?.message || 'Unable to sign out. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>
          Manage your account information
        </Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.profileName}>{fullName}</Text>

        <Text style={styles.profileEmail}>
          {user?.email || 'No email available'}
        </Text>

        <View
          style={[
            styles.roleBadge,
            isAdmin && styles.adminBadge,
            isTeacher && styles.teacherBadge,
          ]}
        >
          <Ionicons
            name={roleIcon}
            size={15}
            color={COLORS.textOnPrimary}
          />

          <Text style={styles.roleBadgeText}>
            {accountLabel}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Ionicons
          name="person-circle-outline"
          size={21}
          color={COLORS.primary}
        />

        <Text style={styles.sectionTitle}>
          Account Information
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.label}>Full Name</Text>

        {editing ? (
          <>
            <TextInput
              style={styles.nameInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textSecondary}
              editable={!saving}
              autoCapitalize="words"
              returnKeyType="done"
              maxLength={100}
            />

            <View style={styles.editActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setDraftName(profile?.full_name ?? '');
                  setEditing(false);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={handleSaveName}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.textOnPrimary}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-outline"
                      size={17}
                      color={COLORS.textOnPrimary}
                    />

                    <Text style={styles.saveText}>
                      Save Changes
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="person-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.infoValue} numberOfLines={2}>
              {fullName}
            </Text>

            <Pressable
              onPress={() => setEditing(true)}
              style={styles.editButton}
              accessibilityRole="button"
              accessibilityLabel="Edit full name"
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={COLORS.primary}
              />

              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.separator} />

        <Text style={styles.label}>Email Address</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="mail-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.infoValue} selectable>
            {user?.email || 'No email available'}
          </Text>
        </View>

        <View style={styles.separator} />

        <Text style={styles.label}>Account Role</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons
              name={roleIcon}
              size={19}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.infoValue}>
            {roleLabel}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Ionicons
          name="settings-outline"
          size={21}
          color={COLORS.primary}
        />

        <Text style={styles.sectionTitle}>
          Account Settings
        </Text>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.settingsIcon}>
          <Ionicons
            name="log-out-outline"
            size={21}
            color={COLORS.textSecondary}
          />
        </View>

        <View style={styles.settingsTextContainer}>
          <Text style={styles.settingsTitle}>Sign Out</Text>

          <Text style={styles.settingsDescription}>
            Sign out of your QR Attendance account.
          </Text>
        </View>
      </View>

      <AppButton
        title={loading ? 'Signing Out...' : 'Sign Out'}
        icon="log-out-outline"
        onPress={handleSignOut}
        disabled={loading || saving}
      />

      <Text style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 26,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  avatarText: {
    fontSize: 31,
    fontWeight: '800',
    color: COLORS.primary,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  profileEmail: {
    marginTop: 5,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginTop: 14,
  },
  adminBadge: {
    backgroundColor: COLORS.primary,
  },
  teacherBadge: {
    backgroundColor: COLORS.textSecondary,
  },
  roleBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 25,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 9,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 43,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 7,
  },
  editText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  nameInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 10,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 125,
  },
  saveText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.65,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 17,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  settingsIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingsDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 22,
  },
});
