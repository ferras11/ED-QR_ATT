import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, getAllProfiles, type Profile, type Role } from '@/lib/profiles';

type RoleFilter = 'all' | Role;

const FILTERS: { label: string; value: RoleFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Students', value: 'student' },
  { label: 'Teachers', value: 'teacher' },
  { label: 'Admins', value: 'admin' },
];

export default function UserManagementScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      if (!user) {
        setProfiles([]);
        setErrorMessage('Please sign in to continue.');
        return;
      }

      const currentProfile = await getProfile(user.id);

      if (currentProfile?.role !== 'admin') {
        setProfiles([]);
        setErrorMessage('Only administrators can access User Management.');
        return;
      }

      const result = await getAllProfiles();
      setProfiles(result);
    } catch (error: any) {
      console.error('Unable to load users:', error);
      setErrorMessage(
        error?.message || 'Unable to load users. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return profiles.filter((profile) => {
      const matchesRole =
        roleFilter === 'all' || profile.role === roleFilter;

      const matchesSearch =
        !query ||
        (profile.full_name ?? '').toLowerCase().includes(query) ||
        (profile.email ?? '').toLowerCase().includes(query);

      return matchesRole && matchesSearch;
    });
  }, [profiles, search, roleFilter]);

  const counts = useMemo(
    () => ({
      all: profiles.length,
      student: profiles.filter((profile) => profile.role === 'student').length,
      teacher: profiles.filter((profile) => profile.role === 'teacher').length,
      admin: profiles.filter((profile) => profile.role === 'admin').length,
    }),
    [profiles]
  );

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'student':
        return 'Student';
      case 'teacher':
        return 'Teacher';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };

  const getRoleIcon = (
    role: Role
  ): keyof typeof Ionicons.glyphMap => {
    switch (role) {
      case 'student':
        return 'person-outline';
      case 'teacher':
        return 'school-outline';
      case 'admin':
        return 'shield-checkmark-outline';
      default:
        return 'person-outline';
    }
  };

  const renderUser = ({ item }: { item: Profile }) => {
    const displayName = item.full_name?.trim() || 'Name not provided';
    const initials = displayName === 'Name not provided'
      ? '?'
      : displayName
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase();

    const isCurrentUser = item.id === user?.id;

    return (
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>

            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youText}>You</Text>
              </View>
            )}
          </View>

          <Text style={styles.userEmail} numberOfLines={2}>
            {item.email || 'No email available'}
          </Text>

          <View style={styles.roleRow}>
            <Ionicons
              name={getRoleIcon(item.role)}
              size={14}
              color={COLORS.primary}
            />
            <Text style={styles.roleText}>
              {getRoleLabel(item.role)}
            </Text>
          </View>
        </View>

        <Ionicons
          name="person-circle-outline"
          size={23}
          color={COLORS.textSecondary}
        />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={COLORS.textPrimary}
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>User Management</Text>
          <Text style={styles.subtitle}>
            View registered accounts and roles
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={() => loadUsers(true)}
          disabled={loading || refreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh user list"
        >
          <Ionicons
            name="refresh-outline"
            size={21}
            color={COLORS.primary}
          />
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons
            name="people-outline"
            size={25}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Registered Accounts</Text>
          <Text style={styles.summaryCount}>
            {loading ? '—' : counts.all}
          </Text>
        </View>

        <Text style={styles.summaryCaption}>Total users</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color={COLORS.textSecondary}
        />

        <TextInput
          style={styles.searchInput}
          placeholder="Search name or email..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search users by name or email"
        />

        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close-circle"
              size={19}
              color={COLORS.textSecondary}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.filterContainer}>
        {FILTERS.map((filter) => {
          const active = roleFilter === filter.value;

          return (
            <Pressable
              key={filter.value}
              style={[
                styles.filterButton,
                active && styles.activeFilterButton,
              ]}
              onPress={() => setRoleFilter(filter.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.activeFilterText,
                ]}
              >
                {filter.label}
              </Text>

              <Text
                style={[
                  styles.filterCount,
                  active && styles.activeFilterCount,
                ]}
              >
                {counts[filter.value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>User Accounts</Text>
        <Text style={styles.listCount}>
          {loading ? 'Loading...' : `${filteredProfiles.length} found`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.stateText}>Loading user accounts...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={COLORS.textSecondary}
            />
          </View>

          <Text style={styles.emptyTitle}>Unable to Load Users</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => loadUsers()}
          >
            <Ionicons
              name="refresh-outline"
              size={17}
              color={COLORS.textOnPrimary}
            />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredProfiles}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={[
            styles.listContent,
            filteredProfiles.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadUsers(true)}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="people-outline"
                  size={34}
                  color={COLORS.textSecondary}
                />
              </View>

              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.stateText}>
                {search.trim()
                  ? 'Try another name or email.'
                  : 'There are no accounts in this category yet.'}
              </Text>

              {(search.length > 0 || roleFilter !== 'all') && (
                <Pressable
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearch('');
                    setRoleFilter('all');
                  }}
                >
                  <Text style={styles.clearFiltersText}>
                    Clear Filters
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      <Text style={styles.footer}>
        Account roles are displayed for reference only.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 22,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 17,
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  summaryIcon: {
    width: 49,
    height: 49,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  summaryText: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  summaryCount: {
    fontSize: 25,
    color: COLORS.textPrimary,
    fontWeight: '800',
    marginTop: 3,
  },
  summaryCaption: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 49,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activeFilterText: {
    color: COLORS.textOnPrimary,
  },
  filterCount: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  activeFilterCount: {
    color: COLORS.textOnPrimary,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  listCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 11,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  avatar: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  userName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  youBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  youText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 35,
  },
  stateText: {
    marginTop: 9,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    paddingHorizontal: 17,
    paddingVertical: 11,
    marginTop: 17,
  },
  retryText: {
    color: COLORS.textOnPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  clearFiltersButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 15,
  },
  clearFiltersText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
});