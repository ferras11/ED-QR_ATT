
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  getAdminAttendanceHistory,
  type AttendanceRecord,
  type TeacherEventAttendance,
  type AdminAttendanceRecord,
} from '@/lib/attendance';
import { buildQRPayload } from '@/lib/qr';

function formatDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'Unknown student';
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="calendar-outline"
          size={34}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);

  const [studentRecords, setStudentRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [teacherEvents, setTeacherEvents] = useState<
    TeacherEventAttendance[]
  >([]);

  const [adminRecords, setAdminRecords] = useState<
    AdminAttendanceRecord[]
  >([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] =
    useState<TeacherEventAttendance | null>(null);

  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [savingQR, setSavingQR] = useState(false);

  const qrExportRef = useRef<View>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) {
      setStudentRecords([]);
      setTeacherEvents([]);
      setAdminRecords([]);
      setRole(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);

        setTeacherEvents(events);
        setStudentRecords([]);
        setAdminRecords([]);
      } else if (currentRole === 'admin') {
        const records = await getAdminAttendanceHistory();

        setAdminRecords(records);
        setStudentRecords([]);
        setTeacherEvents([]);
      } else {
        const records = await getAttendanceHistory(user.id);

        setStudentRecords(records);
        setTeacherEvents([]);
        setAdminRecords([]);
      }
    } catch (loadError) {
      console.error('Loading history failed:', loadError);

      setError(
        'Unable to load records. Please check your connection and Supabase permissions, then refresh.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openEventQR = (event: TeacherEventAttendance) => {
    setSelectedEvent(event);
    setQrModalVisible(true);
  };

  const closeEventQR = () => {
    if (savingQR) return;
    setQrModalVisible(false);
  };

  const saveEventQR = async () => {
    if (!selectedEvent || !qrExportRef.current) {
      Alert.alert(
        'QR Code Unavailable',
        'Please open an event QR code first.'
      );
      return;
    }

    try {
      setSavingQR(true);

      const permission =
        await MediaLibrary.requestPermissionsAsync(true, ['photo']);

      if (!permission.granted) {
        Alert.alert(
          'Gallery Permission Required',
          'Please allow QR-ATT to save images to your gallery, then try again.'
        );
        return;
      }

      const imageUri = await captureRef(qrExportRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await MediaLibrary.createAssetAsync(imageUri);

      Alert.alert(
        'QR Code Saved!',
        `The QR code for "${selectedEvent.title}" has been saved to your gallery.`
      );
    } catch (saveError) {
      console.error('Saving QR image failed:', saveError);

      Alert.alert(
        'Save Failed',
        'Unable to save this QR image. Please try again.'
      );
    } finally {
      setSavingQR(false);
    }
  };

  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  const totalAttendance = studentRecords.length;
  const totalAttendees = teacherEvents.reduce(
    (total, event) => total + event.attendeeCount,
    0
  );

  const filteredAdminRecords = adminRecords.filter((record) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      record.eventTitle,
      record.eventId,
      record.studentName ?? '',
      record.studentId ?? '',
      record.teacherName ?? '',
    ].some((value) => value.toLowerCase().includes(query));
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="time-outline"
            size={30}
            color={COLORS.primary}
          />
        </View>

        <ActivityIndicator size="large" color={COLORS.primary} />

        <Text style={styles.loadingTitle}>Loading records</Text>
        <Text style={styles.loadingSubtitle}>
          Please wait a moment.
        </Text>
      </View>
    );
  }

  const listData: any[] = isTeacher
    ? teacherEvents
    : isAdmin
      ? filteredAdminRecords
      : studentRecords;

  const listKey = isTeacher
    ? 'teacher-history'
    : isAdmin
      ? 'admin-history'
      : 'student-history';

  const emptyTitle = isTeacher
    ? 'No events yet'
    : isAdmin
      ? search.trim()
        ? 'No matching records'
        : 'No attendance records'
      : 'No attendance records';

  const emptyDescription = isTeacher
    ? 'Create your first event in the Teacher tab to see its attendance here.'
    : isAdmin
      ? search.trim()
        ? 'Try searching with a different student, event, or teacher name.'
        : 'School-wide attendance records will appear here when students scan event QR codes.'
      : 'Scan a valid event QR code to record your attendance. Your records will appear here.';

  return (
    <View style={styles.container}>
      <FlatList<any>
        key={listKey}
        data={listData}
        keyExtractor={(item) =>
          isTeacher
            ? (item as TeacherEventAttendance).eventId
            : isAdmin
              ? String((item as AdminAttendanceRecord).id)
              : String((item as AttendanceRecord).id)
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeader}>
              <View style={styles.pageHeaderText}>
                <Text style={styles.eyebrow}>
                  {isAdmin ? 'SYSTEM OVERVIEW' : 'YOUR RECORDS'}
                </Text>

                <Text style={styles.pageTitle}>
                  {isTeacher
                    ? 'My Events'
                    : isAdmin
                      ? 'Attendance Records'
                      : 'Attendance History'}
                </Text>

                <Text style={styles.pageSubtitle}>
                  {isTeacher
                    ? 'Review your events and attendance.'
                    : isAdmin
                      ? 'Monitor attendance records across the school.'
                      : 'Keep track of your attendance records.'}
                </Text>
              </View>

              <View style={styles.headerIcon}>
                <Ionicons
                  name={
                    isAdmin
                      ? 'shield-checkmark-outline'
                      : 'time-outline'
                  }
                  size={27}
                  color={COLORS.primary}
                />
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons
                  name={
                    isTeacher
                      ? 'calendar-outline'
                      : isAdmin
                        ? 'people-outline'
                        : 'checkmark-done-outline'
                  }
                  size={25}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.summaryText}>
                <Text style={styles.summaryLabel}>
                  {isTeacher
                    ? 'Events Created'
                    : isAdmin
                      ? 'Total Records'
                      : 'Recorded Attendance'}
                </Text>

                <Text style={styles.summaryValue}>
                  {isTeacher
                    ? teacherEvents.length
                    : isAdmin
                      ? adminRecords.length
                      : totalAttendance}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryText}>
                <Text style={styles.summaryLabel}>
                  {isTeacher
                    ? 'Total Scans'
                    : isAdmin
                      ? 'Students Present'
                      : 'Account'}
                </Text>

                <Text
                  style={[styles.summaryValue, styles.secondaryValue]}
                  numberOfLines={1}
                >
                  {isTeacher
                    ? totalAttendees
                    : isAdmin
                      ? new Set(
                          adminRecords.map((record) => record.studentId)
                        ).size
                      : 'Student'}
                </Text>
              </View>
            </View>

            {isAdmin ? (
              <View style={styles.adminInfoCard}>
                <View style={styles.adminInfoIcon}>
                  <Ionicons
                    name="information-circle-outline"
                    size={21}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.adminInfoText}>
                  <Text style={styles.adminInfoTitle}>
                    School-wide attendance
                  </Text>
                  <Text style={styles.adminInfoDescription}>
                    Search by student, event, event code, or teacher.
                  </Text>
                </View>
              </View>
            ) : null}

            {isAdmin ? (
              <View style={styles.searchContainer}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={COLORS.textSecondary}
                />

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search attendance records..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  returnKeyType="search"
                  accessibilityLabel="Search attendance records"
                />

                {search.length > 0 ? (
                  <Pressable
                    onPress={() => setSearch('')}
                    accessibilityLabel="Clear search"
                    hitSlop={10}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <SectionHeading
              title={
                isTeacher
                  ? 'Your Events'
                  : isAdmin
                    ? 'All Attendance'
                    : 'Your Attendance'
              }
              subtitle={
                isTeacher
                  ? 'View event QR codes and recorded attendance'
                  : isAdmin
                    ? `${filteredAdminRecords.length} matching record${filteredAdminRecords.length === 1 ? '' : 's'}`
                    : 'Your recorded check-ins'
              }
            />

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color="#C62828"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
          />
        }
        renderItem={({ item }) => {
          if (isTeacher) {
            const event = item as TeacherEventAttendance;

            return (
              <View style={styles.eventCard}>
                <View style={styles.eventTop}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={23}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventCode}>
                      {event.eventCode}
                    </Text>
                  </View>

                  <View style={styles.attendeeBadge}>
                    <Ionicons
                      name="people-outline"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.attendeeBadgeText}>
                      {event.attendeeCount}
                    </Text>
                  </View>
                </View>

                {event.startTime ? (
                  <View style={styles.dateRow}>
                    <Ionicons
                      name="play-circle-outline"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.dateText}>
                      Starts: {formatDate(event.startTime)}
                    </Text>
                  </View>
                ) : null}

                {event.endTime ? (
                  <View style={styles.dateRow}>
                    <Ionicons
                      name="flag-outline"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.dateText}>
                      Ends: {formatDate(event.endTime)}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  style={styles.viewQRButton}
                  onPress={() => openEventQR(event)}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={19}
                    color="#FFFFFF"
                  />
                  <Text style={styles.viewQRButtonText}>
                    View QR Code
                  </Text>
                </Pressable>

                <View style={styles.attendeeSection}>
                  <Text style={styles.attendeeSectionTitle}>
                    ATTENDEES
                  </Text>

                  {event.attendees.length === 0 ? (
                    <View style={styles.noAttendees}>
                      <Ionicons
                        name="people-outline"
                        size={18}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.noAttendeesText}>
                        No attendance scans yet.
                      </Text>
                    </View>
                  ) : (
                    event.attendees.map((attendee, index) => (
                      <View
                        key={`${event.eventId}-${attendee.studentId}-${index}`}
                        style={styles.attendeeRow}
                      >
                        <View style={styles.studentIcon}>
                          <Ionicons
                            name="person-outline"
                            size={17}
                            color={COLORS.primary}
                          />
                        </View>

                        <View style={styles.attendeeInfo}>
                          <Text
                            style={styles.attendeeName}
                            numberOfLines={1}
                          >
                            {attendee.studentName ??
                              shortId(attendee.studentId)}
                          </Text>

                          <Text style={styles.attendeeTime}>
                            {formatDate(attendee.scannedAt)}
                          </Text>
                        </View>

                        <Ionicons
                          name="checkmark-circle"
                          size={19}
                          color="#2E7D32"
                        />
                      </View>
                    ))
                  )}
                </View>
              </View>
            );
          }

          if (isAdmin) {
            const record = item as AdminAttendanceRecord;

            return (
              <View style={styles.eventCard}>
                <View style={styles.eventTop}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      name="checkmark-done-circle-outline"
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>
                      {record.eventTitle || 'Unknown Event'}
                    </Text>
                    <Text style={styles.eventCode}>
                      {record.eventId || 'No event code'}
                    </Text>
                  </View>

                  <View style={styles.presentBadge}>
                    <Text style={styles.presentBadgeText}>
                      Recorded
                    </Text>
                  </View>
                </View>

                <View style={styles.adminRecordRow}>
                  <View style={styles.adminRecordIcon}>
                    <Ionicons
                      name="person-outline"
                      size={17}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.adminRecordInfo}>
                    <Text style={styles.adminRecordLabel}>
                      STUDENT
                    </Text>
                    <Text style={styles.adminRecordValue}>
                      {record.studentName ??
                        shortId(record.studentId)}
                    </Text>
                  </View>
                </View>

                <View style={styles.adminRecordRow}>
                  <View style={styles.adminRecordIcon}>
                    <Ionicons
                      name="school-outline"
                      size={17}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.adminRecordInfo}>
                    <Text style={styles.adminRecordLabel}>
                      EVENT ORGANIZER
                    </Text>
                    <Text style={styles.adminRecordValue}>
                      {record.teacherName || 'Unknown organizer'}
                    </Text>
                  </View>
                </View>

                <View style={styles.dateRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.dateText}>
                    Scanned: {formatDate(record.scannedAt)}
                  </Text>
                </View>
              </View>
            );
          }

          const record = item as AttendanceRecord;

          return (
            <View style={styles.eventCard}>
              <View style={styles.eventTop}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>
                    {record.eventTitle}
                  </Text>
                  <Text style={styles.eventCode}>
                    {record.eventId}
                  </Text>
                </View>

                <View style={styles.presentBadge}>
                  <Text style={styles.presentBadgeText}>
                    Recorded
                  </Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.dateText}>
                  {formatDate(record.scannedAt)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEventQR}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <View style={styles.qrModalHeaderText}>
                <Text style={styles.qrModalTitle}>
                  Event QR Code
                </Text>
                <Text style={styles.qrModalSubtitle}>
                  Let students scan this code to record attendance.
                </Text>
              </View>

              <Pressable
                onPress={closeEventQR}
                style={styles.qrCloseButton}
                accessibilityLabel="Close QR code"
                disabled={savingQR}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={COLORS.textPrimary}
                />
              </Pressable>
            </View>

            {selectedEvent ? (
              <>
                <View
                  ref={qrExportRef}
                  collapsable={false}
                  style={styles.qrExportContent}
                >
                  <Text style={styles.qrEventTitle}>
                    {selectedEvent.title}
                  </Text>

                  <Text style={styles.qrEventCode}>
                    {selectedEvent.eventCode}
                  </Text>

                  <View style={styles.qrImageContainer}>
                    <QRCode
                      value={buildQRPayload({
                        eventId: selectedEvent.eventCode,
                        title: selectedEvent.title,
                        start:
                          selectedEvent.startTime ?? undefined,
                        end:
                          selectedEvent.endTime ?? undefined,
                      })}
                      size={220}
                      backgroundColor="#FFFFFF"
                      color="#000000"
                    />
                  </View>

                  {selectedEvent.startTime ? (
                    <Text style={styles.qrSchedule}>
                      Starts: {formatDate(selectedEvent.startTime)}
                    </Text>
                  ) : null}

                  {selectedEvent.endTime ? (
                    <Text style={styles.qrSchedule}>
                      Ends: {formatDate(selectedEvent.endTime)}
                    </Text>
                  ) : null}

                  <Text style={styles.qrFooter}>
                    QR-ATT Attendance System
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.saveQRButton,
                    savingQR && styles.saveQRButtonDisabled,
                  ]}
                  onPress={saveEventQR}
                  disabled={savingQR}
                >
                  {savingQR ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="download-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                  )}

                  <Text style={styles.saveQRButtonText}>
                    {savingQR
                      ? 'Saving Image...'
                      : 'Save QR Image to Gallery'}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
    flexGrow: 1,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  pageHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },

  pageTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  pageSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  headerIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 19,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 27,
  },

  summaryIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  summaryText: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },

  summaryValue: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  secondaryValue: {
    fontSize: 19,
  },

  summaryDivider: {
    width: 1,
    height: 43,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
  },

  adminInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 14,
    marginBottom: 20,
    gap: 11,
  },

  adminInfoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  adminInfoText: {
    flex: 1,
  },

  adminInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  adminInfoDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 49,
    marginBottom: 24,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },

  sectionHeading: {
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  eventIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  eventInfo: {
    flex: 1,
    minWidth: 0,
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 21,
  },

  eventCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  attendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 5,
  },

  attendeeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  presentBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 5,
  },

  presentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 7,
  },

  dateText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  viewQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    paddingVertical: 13,
    marginTop: 15,
    marginBottom: 3,
  },

  viewQRButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  attendeeSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 16,
    paddingTop: 14,
  },

  attendeeSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },

  noAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },

  noAttendeesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 10,
  },

  studentIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  attendeeInfo: {
    flex: 1,
    minWidth: 0,
  },

  attendeeName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  attendeeTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  adminRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  adminRecordIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  adminRecordInfo: {
    flex: 1,
    minWidth: 0,
  },

  adminRecordLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  adminRecordValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 13,
    backgroundColor: '#FFEBEE',
    marginBottom: 15,
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#C62828',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingIcon: {
    width: 66,
    height: 66,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  loadingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 17,
  },

  loadingSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  qrModalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '95%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
  },

  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  qrModalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  qrModalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  qrModalSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  qrCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qrExportContent: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },

  qrEventTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#172033',
    textAlign: 'center',
  },

  qrEventCode: {
    fontSize: 12,
    color: '#667085',
    marginTop: 6,
    marginBottom: 16,
  },

  qrImageContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },

  qrSchedule: {
    fontSize: 11,
    color: '#475467',
    textAlign: 'center',
    marginTop: 10,
  },

  qrFooter: {
    fontSize: 10,
    fontWeight: '700',
    color: '#667085',
    marginTop: 16,
  },

  saveQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 16,
  },

  saveQRButtonDisabled: {
    opacity: 0.65,
  },

  saveQRButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
