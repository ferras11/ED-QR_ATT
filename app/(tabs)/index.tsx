
import { useCallback, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { useAuth } from '../../lib/auth';
import { getProfile, type Role } from '../../lib/profiles';
import {
  getAdminDashboardStats,
  type AdminDashboardStats,
} from '../../lib/attendance';

const COLORS = {
  background: '#F3F8FC',
  primary: '#DFF0F9',
  primaryDark: '#536D7A',
  text: '#142130',
  muted: '#637782',
  white: '#FFFFFF',
  border: '#DFE8EE',
  line: '#E9EFF3',
  success: '#DDF3E9',
  successText: '#398568',
  warm: '#FFF0DD',
  warmText: '#B77C39',
  blueLight: '#E4F0F8',
  shadow: '#263D4B',
  adminLight: '#E4F0F8',
  adminText: '#536D7A',
};

type IconName = ComponentProps<typeof Ionicons>['name'];

type DashboardAction = {
  icon: IconName;
  title: string;
  description: string;
  iconColor: string;
  iconBackground: string;
  onPress: () => void;
};

export default function HomeScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [adminStats, setAdminStats] =
    useState<AdminDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setRole(null);
      setFullName('');
      setLoadError(true);
      setLoading(false);
      return;
    }

    try {
      setLoadError(false);

      const profile = await getProfile(user.id);

      if (!profile) {
        setRole(null);
        setFullName('');
        setLoadError(true);
        return;
      }

      setRole(profile.role);
      setFullName(
        typeof profile.full_name === 'string'
          ? profile.full_name
          : ''
      );
    } catch (error) {
      console.error('Dashboard profile error:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadAdminStats = useCallback(async () => {
    if (role !== 'admin') {
      setAdminStats(null);
      setStatsError(false);
      setStatsLoading(false);
      return;
    }

    try {
      setStatsLoading(true);
      setStatsError(false);

      const stats = await getAdminDashboardStats();
      setAdminStats(stats);
    } catch (error) {
      console.error('Unable to load admin statistics:', error);
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadDashboard();
    }, [loadDashboard])
  );

  useFocusEffect(
    useCallback(() => {
      if (role === 'admin') {
        loadAdminStats();
      }
    }, [role, loadAdminStats])
  );

  const goTo = (
    path:
      | '/scan'
      | '/history'
      | '/teacher'
      | '/profile'
      | '/user-management'
      | '/event-monitoring'
  ) => {
    router.push(path);
  };

  const firstName = fullName.trim().split(/\s+/)[0] || 'there';
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  const dashboardName = isAdmin
    ? 'Administrator'
    : isTeacher
      ? 'Teacher'
      : 'Student';

  const actions: DashboardAction[] = isAdmin
    ? [
        {
          icon: 'people-outline',
          title: 'User Management',
          description: 'View and search registered accounts',
          iconColor: COLORS.adminText,
          iconBackground: COLORS.adminLight,
          onPress: () => goTo('/user-management'),
        },
        {
          icon: 'stats-chart-outline',
          title: 'Attendance Records',
          description: 'Monitor school-wide attendance',
          iconColor: COLORS.successText,
          iconBackground: COLORS.success,
          onPress: () => goTo('/history'),
        },
        {
          icon: 'calendar-outline',
          title: 'Event Monitoring',
          description: 'Monitor attendance events',
          iconColor: COLORS.primaryDark,
          iconBackground: COLORS.primary,
          onPress: () => goTo('/event-monitoring'),
        },
        {
          icon: 'person-outline',
          title: 'My Profile',
          description: 'View your account',
          iconColor: COLORS.warmText,
          iconBackground: COLORS.warm,
          onPress: () => goTo('/profile'),
        },
      ]
    : [
        {
          icon: isTeacher ? 'add-circle-outline' : 'scan-outline',
          title: isTeacher ? 'Create Event' : 'Scan QR Code',
          description: isTeacher
            ? 'Set up a new event'
            : 'Record your attendance',
          iconColor: COLORS.primaryDark,
          iconBackground: COLORS.primary,
          onPress: () => goTo(isTeacher ? '/teacher' : '/scan'),
        },
        {
          icon: 'time-outline',
          title: isTeacher ? 'My Events' : 'My History',
          description: isTeacher
            ? 'Review events and attendees'
            : 'Review past attendance',
          iconColor: COLORS.successText,
          iconBackground: COLORS.success,
          onPress: () => goTo('/history'),
        },
        {
          icon: 'person-outline',
          title: 'My Profile',
          description: 'View your account',
          iconColor: COLORS.warmText,
          iconBackground: COLORS.warm,
          onPress: () => goTo('/profile'),
        },
        {
          icon: 'clipboard-outline',
          title: isTeacher
            ? 'Attendance Records'
            : 'Attendance Guide',
          description: isTeacher
            ? 'Open your attendance records'
            : 'Learn how to use attendance',
          iconColor: COLORS.primaryDark,
          iconBackground: COLORS.blueLight,
          onPress: () => goTo(isTeacher ? '/history' : '/scan'),
        },
      ];

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />

        <View style={styles.loadingLogo}>
          <Ionicons
            name="qr-code-outline"
            size={35}
            color={COLORS.primaryDark}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.primaryDark}
          style={{ marginTop: 20 }}
        />

        <Text style={styles.loadingText}>
          Preparing your dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  if (loadError || !role) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />

        <View style={styles.errorIcon}>
          <Ionicons
            name="cloud-offline-outline"
            size={34}
            color={COLORS.primaryDark}
          />
        </View>

        <Text style={styles.errorTitle}>
          Unable to load dashboard
        </Text>

        <Text style={styles.errorText}>
          Please check your connection and try again.
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            loadDashboard();
          }}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={COLORS.white}
          />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Ionicons
                name="qr-code-outline"
                size={27}
                color={COLORS.primaryDark}
              />
            </View>

            <View>
              <Text style={styles.brandName}>QR ATTENDANCE</Text>
              <Text style={styles.brandSubtitle}>
                CCTC ATTENDANCE SYSTEM
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => goTo('/profile')}
            style={({ pressed }) => [
              styles.profileButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={23}
              color={COLORS.primaryDark}
            />
          </Pressable>
        </View>

        <View style={styles.greetingSection}>
          <Text style={styles.eyebrow}>
            {isAdmin
              ? 'ADMINISTRATOR WORKSPACE'
              : isTeacher
                ? 'TEACHER WORKSPACE'
                : 'STUDENT WORKSPACE'}
          </Text>

          <Text style={styles.greeting}>
            Hello, {firstName}! <Text>👋</Text>
          </Text>

          <Text style={styles.greetingDescription}>
            {isAdmin
              ? 'Monitor the attendance system and manage school accounts.'
              : isTeacher
                ? 'Manage your events and attendance in one place.'
                : 'Your attendance, organized and easy to access.'}
          </Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <View
                style={[
                  styles.statusDot,
                  isAdmin && styles.adminStatusDot,
                ]}
              />
              <Text style={styles.heroBadgeText}>
                {isAdmin
                  ? 'ADMIN PORTAL'
                  : isTeacher
                    ? 'TEACHER PORTAL'
                    : 'STUDENT PORTAL'}
              </Text>
            </View>

            <View style={styles.heroIllustration}>
              <Ionicons
                name={
                  isAdmin
                    ? 'shield-checkmark-outline'
                    : isTeacher
                      ? 'calendar-outline'
                      : 'qr-code-outline'
                }
                size={43}
                color={COLORS.primaryDark}
              />
            </View>
          </View>

          <Text style={styles.heroTitle}>
            {isAdmin
              ? 'Your school at a glance.'
              : isTeacher
                ? 'Attendance starts here.'
                : 'Ready to check in?'}
          </Text>

          <Text style={styles.heroDescription}>
            {isAdmin
              ? 'Access administrative tools for managing users and monitoring attendance.'
              : isTeacher
                ? 'Create an event, share its QR code, and review recorded attendance.'
                : 'Scan your event QR code to record your attendance quickly.'}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (isAdmin) {
                goTo('/user-management');
              } else {
                goTo(isTeacher ? '/teacher' : '/scan');
              }
            }}
            style={({ pressed }) => [
              styles.heroButton,
              pressed && styles.heroButtonPressed,
            ]}
          >
            <Ionicons
              name={
                isAdmin
                  ? 'people-outline'
                  : isTeacher
                    ? 'add-circle-outline'
                    : 'scan-outline'
              }
              size={21}
              color={COLORS.white}
            />

            <Text style={styles.heroButtonText}>
              {isAdmin
                ? 'Manage Users'
                : isTeacher
                  ? 'Create an Event'
                  : 'Scan Attendance QR'}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color={COLORS.white}
            />
          </Pressable>

          <View style={styles.heroBottomLine}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={COLORS.primaryDark}
            />
            <Text style={styles.heroBottomText}>
              {isAdmin
                ? 'Authorized administrative access'
                : 'Simple and organized attendance'}
            </Text>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.statsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.statsHeading}>
                <Text style={styles.sectionTitle}>System Overview</Text>
                <Text style={styles.sectionSubtitle}>
                  Current school attendance statistics
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh dashboard statistics"
                onPress={loadAdminStats}
                disabled={statsLoading}
                style={({ pressed }) => [
                  styles.statsRefreshButton,
                  pressed && styles.pressed,
                  statsLoading && styles.disabledButton,
                ]}
              >
                {statsLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.primaryDark}
                  />
                ) : (
                  <Ionicons
                    name="refresh-outline"
                    size={19}
                    color={COLORS.primaryDark}
                  />
                )}
              </Pressable>
            </View>

            {statsLoading && !adminStats ? (
              <View style={styles.statsLoading}>
                <ActivityIndicator color={COLORS.primaryDark} />
                <Text style={styles.sectionSubtitle}>
                  Loading statistics...
                </Text>
              </View>
            ) : statsError && !adminStats ? (
              <View style={styles.statsError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={25}
                  color={COLORS.warmText}
                />
                <Text style={styles.statsErrorText}>
                  Statistics couldn't be loaded. Check your connection
                  and permissions, then try again.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={loadAdminStats}
                  style={styles.statsRetryButton}
                >
                  <Text style={styles.statsRetryText}>Try again</Text>
                </Pressable>
              </View>
            ) : adminStats ? (
              <>
                <View style={styles.statsGrid}>
                  <StatCard
                    icon="school-outline"
                    label="Students"
                    value={adminStats.totalStudents}
                    color={COLORS.primaryDark}
                    background={COLORS.primary}
                  />

                  <StatCard
                    icon="people-outline"
                    label="Teachers"
                    value={adminStats.totalTeachers}
                    color={COLORS.primaryDark}
                    background={COLORS.blueLight}
                  />

                  <StatCard
                    icon="calendar-outline"
                    label="Events"
                    value={adminStats.totalEvents}
                    color={COLORS.successText}
                    background={COLORS.success}
                  />

                  <StatCard
                    icon="checkmark-done-outline"
                    label="Attendance"
                    value={adminStats.totalAttendance}
                    color={COLORS.warmText}
                    background={COLORS.warm}
                  />
                </View>

                {statsError && (
                  <Text style={styles.statsStaleText}>
                    Refresh failed. Showing the last successfully loaded totals.
                  </Text>
                )}
              </>
            ) : null}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {isAdmin ? 'Admin Tools' : 'Quick Access'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isAdmin
                ? 'Choose an administrative section.'
                : 'Choose what you want to do.'}
            </Text>
          </View>
        </View>

        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <ActionCard
              key={action.title}
              icon={action.icon}
              title={action.title}
              description={action.description}
              iconColor={action.iconColor}
              iconBackground={action.iconBackground}
              onPress={action.onPress}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {isAdmin
                ? 'Administrator Guide'
                : isTeacher
                  ? 'Your Workflow'
                  : 'How It Works'}
            </Text>

            <Text style={styles.sectionSubtitle}>
              {isAdmin
                ? 'A quick overview of your responsibilities.'
                : isTeacher
                  ? 'Manage attendance in a few simple steps.'
                  : 'Getting started is easy.'}
            </Text>
          </View>
        </View>

        <View style={styles.stepsCard}>
          {isAdmin ? (
            <>
              <StepRow
                number="01"
                icon="people-outline"
                title="Manage user accounts"
                description="Review registered accounts and their assigned roles."
                last={false}
              />

              <StepRow
                number="02"
                icon="calendar-outline"
                title="Monitor events"
                description="Review school attendance events and their status."
                last={false}
              />

              <StepRow
                number="03"
                icon="stats-chart-outline"
                title="Review attendance"
                description="Check the attendance records and system totals."
                last
              />
            </>
          ) : (
            <>
              <StepRow
                number="01"
                icon={isTeacher ? 'calendar-outline' : 'scan-outline'}
                title={isTeacher ? 'Create an event' : 'Open the scanner'}
                description={
                  isTeacher
                    ? 'Set your event title and schedule.'
                    : 'Open Scan QR Code from the dashboard or tab bar.'
                }
                last={false}
              />

              <StepRow
                number="02"
                icon="qr-code-outline"
                title={isTeacher ? 'Display the event QR' : 'Scan the event QR'}
                description={
                  isTeacher
                    ? 'Show the generated QR code to students.'
                    : 'Point your camera at the event QR code.'
                }
                last={false}
              />

              <StepRow
                number="03"
                icon="checkmark-circle-outline"
                title={isTeacher ? 'Review attendance' : 'Check your history'}
                description={
                  isTeacher
                    ? 'View your events and recorded attendees.'
                    : 'Check your attendance records in History.'
                }
                last
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  background,
}: {
  icon: IconName;
  label: string;
  value: number;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  description,
  iconColor,
  iconBackground,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  iconColor: string;
  iconBackground: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={25} color={iconColor} />
      </View>

      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>

      <View style={styles.actionArrow}>
        <Ionicons
          name="arrow-forward"
          size={17}
          color={COLORS.muted}
        />
      </View>
    </Pressable>
  );
}

function StepRow({
  number,
  icon,
  title,
  description,
  last,
}: {
  number: string;
  icon: IconName;
  title: string;
  description: string;
  last: boolean;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepTimeline}>
        <View style={styles.stepIcon}>
          <Ionicons
            name={icon}
            size={21}
            color={COLORS.primaryDark}
          />
        </View>

        {!last && <View style={styles.stepLine} />}
      </View>

      <View style={styles.stepContent}>
        <Text style={styles.stepNumber}>STEP {number}</Text>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 35,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  loadingLogo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 13,
    fontSize: 14,
    color: COLORS.muted,
  },
  errorIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  errorTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 22,
    paddingHorizontal: 25,
    paddingVertical: 14,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 15,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  brandIcon: {
    width: 47,
    height: 47,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: '900',
    color: COLORS.text,
  },
  brandSubtitle: {
    marginTop: 4,
    fontSize: 8,
    letterSpacing: 0.8,
    color: COLORS.muted,
    fontWeight: '700',
  },
  profileButton: {
    height: 46,
    width: 46,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingSection: {
    marginBottom: 23,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.8,
    color: COLORS.primaryDark,
    fontWeight: '900',
    marginBottom: 9,
  },
  greeting: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: COLORS.text,
  },
  greetingDescription: {
    marginTop: 7,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    borderRadius: 25,
    padding: 21,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 30,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.045,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
  },
  statusDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: COLORS.successText,
  },
  adminStatusDot: {
    backgroundColor: COLORS.primaryDark,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.primaryDark,
  },
  heroIllustration: {
    width: 67,
    height: 67,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: COLORS.text,
  },
  heroDescription: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
  },
  heroButton: {
    marginTop: 20,
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: COLORS.primaryDark,
  },
  heroButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  heroButtonText: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },
  heroBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 15,
  },
  heroBottomText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 5,
    lineHeight: 18,
  },
  statsSection: {
    marginBottom: 30,
  },
  statsHeading: {
    flex: 1,
  },
  statsRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  statCard: {
    width: '48.2%',
    minHeight: 133,
    padding: 15,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.text,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  statsLoading: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsError: {
    padding: 16,
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsErrorText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.muted,
  },
  statsRetryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
  },
  statsRetryText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  statsStaleText: {
    marginTop: 9,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.warmText,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 13,
    marginBottom: 30,
  },
  actionCard: {
    width: '48.2%',
    minHeight: 159,
    backgroundColor: COLORS.white,
    borderRadius: 21,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },
  actionIcon: {
    width: 47,
    height: 47,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  actionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    paddingRight: 3,
  },
  actionDescription: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    paddingRight: 2,
  },
  actionArrow: {
    position: 'absolute',
    top: 17,
    right: 12,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  stepsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 17,
    paddingTop: 19,
    paddingBottom: 5,
    marginBottom: 27,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 92,
  },
  stepTimeline: {
    width: 43,
    alignItems: 'center',
  },
  stepIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepLine: {
    position: 'absolute',
    top: 39,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.line,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 1,
    paddingBottom: 17,
  },
  stepNumber: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  stepTitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  stepDescription: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
  },
  footer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.muted,
  },
});
