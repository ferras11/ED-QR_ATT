
import { useCallback, useMemo, useState } from 'react';
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

import { supabase } from '../lib/supabase';

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
};

type EventStatus = 'Upcoming' | 'Ongoing' | 'Ended';
type FilterType = 'All' | EventStatus;

type SchoolEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string | null;
  created_by: string | null;
  attendeeCount: number;
};

type Attendee = {
  id: string;
  studentId: string;
  studentName: string;
  scannedAt: string | null;
};

function getEventStatus(
  startTime: string | null,
  endTime: string | null
): EventStatus {
  const now = Date.now();
  const start = startTime ? new Date(startTime).getTime() : null;
  const end = endTime ? new Date(endTime).getTime() : null;

  if (start !== null && Number.isFinite(start) && now < start) {
    return 'Upcoming';
  }

  if (end !== null && Number.isFinite(end) && now > end) {
    return 'Ended';
  }

  if (start !== null && end !== null) {
    return 'Ongoing';
  }

  if (start !== null && now < start) {
    return 'Upcoming';
  }

  if (end !== null && now > end) {
    return 'Ended';
  }

  return 'Ongoing';
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not set';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not set';

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EventMonitoringScreen() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [filter, setFilter] = useState<FilterType>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [expandedEvents, setExpandedEvents] = useState<
    Record<string, boolean>
  >({});
  const [attendanceByEvent, setAttendanceByEvent] = useState<
    Record<string, Attendee[]>
  >({});
  const [loadingAttendance, setLoadingAttendance] = useState<
    Record<string, boolean>
  >({});
  const [attendanceErrors, setAttendanceErrors] = useState<
    Record<string, string>
  >({});

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const { data: eventRows, error: eventError } = await supabase
        .from('events')
        .select(
          'id, event_code, title, start_time, end_time, created_at, created_by'
        )
        .order('created_at', { ascending: false });

      if (eventError) throw eventError;

      const eventList = eventRows ?? [];
      const eventIds = eventList.map((event) => event.id);

      let counts: Record<string, number> = {};

      if (eventIds.length > 0) {
        const { data: attendanceRows, error: attendanceError } =
          await supabase
            .from('attendance')
            .select('event_id')
            .in('event_id', eventIds);

        if (attendanceError) throw attendanceError;

        for (const row of attendanceRows ?? []) {
          counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
        }
      }

      setEvents(
        eventList.map((event) => ({
          ...event,
          attendeeCount: counts[event.id] ?? 0,
        }))
      );
    } catch (err) {
      console.error('Unable to load monitored events:', err);
      setError(
        'Unable to load events. Check your connection and account permissions, then try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load attendance without relying on a Supabase foreign-key join.
  const loadEventAttendance = useCallback(async (eventId: string) => {
    setLoadingAttendance((previous) => ({
      ...previous,
      [eventId]: true,
    }));

    setAttendanceErrors((previous) => ({
      ...previous,
      [eventId]: '',
    }));

    try {
      // First, retrieve the attendance records.
      const {
        data: attendanceRecords,
        error: attendanceError,
      } = await supabase
        .from('attendance')
        .select('id, student_id, scanned_at')
        .eq('event_id', eventId)
        .order('scanned_at', { ascending: false });

      if (attendanceError) {
        throw attendanceError;
      }

      const records = attendanceRecords ?? [];

      // Collect unique student IDs.
      const studentIds = [
        ...new Set(
          records
            .map((record) => record.student_id)
            .filter(
              (studentId): studentId is string =>
                typeof studentId === 'string' && studentId.length > 0
            )
        ),
      ];

      // Fetch profiles separately instead of using profiles:student_id.
      const profileMap: Record<string, string> = {};

      if (studentIds.length > 0) {
        const {
          data: profiles,
          error: profilesError,
        } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', studentIds);

        if (profilesError) {
          // Attendance can still be displayed if profile access is restricted.
          console.error(
            'Unable to load student profiles:',
            profilesError.code,
            profilesError.message,
            profilesError.details
          );
        } else {
          for (const profile of profiles ?? []) {
            profileMap[profile.id] =
              profile.full_name || 'Unknown Student';
          }
        }
      }

      const attendees: Attendee[] = records.map((record) => {
        const studentId = String(record.student_id ?? '');

        return {
          id: String(record.id),
          studentId,
          studentName: studentId
            ? profileMap[studentId] ||
              `Student ${studentId.slice(-6)}`
            : 'Unknown Student',
          scannedAt: record.scanned_at ?? null,
        };
      });

      setAttendanceByEvent((previous) => ({
        ...previous,
        [eventId]: attendees,
      }));

      // Synchronize the displayed attendee count.
      setEvents((previous) =>
        previous.map((event) =>
          event.id === eventId
            ? { ...event, attendeeCount: attendees.length }
            : event
        )
      );
    } catch (err: any) {
      console.error(
        `Unable to load attendance for event ${eventId}:`,
        {
          code: err?.code,
          message: err?.message,
          details: err?.details,
          hint: err?.hint,
        }
      );

      setAttendanceErrors((previous) => ({
        ...previous,
        [eventId]:
          'Unable to load this event’s attendance. Please try again.',
      }));
    } finally {
      setLoadingAttendance((previous) => ({
        ...previous,
        [eventId]: false,
      }));
    }
  }, []);

  const toggleAttendance = useCallback(
    (eventId: string) => {
      const willExpand = !expandedEvents[eventId];

      setExpandedEvents((previous) => ({
        ...previous,
        [eventId]: willExpand,
      }));

      if (
        willExpand &&
        attendanceByEvent[eventId] === undefined &&
        !loadingAttendance[eventId]
      ) {
        loadEventAttendance(eventId);
      }
    },
    [
      expandedEvents,
      attendanceByEvent,
      loadingAttendance,
      loadEventAttendance,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const filteredEvents = useMemo(() => {
    if (filter === 'All') return events;

    return events.filter(
      (event) =>
        getEventStatus(event.start_time, event.end_time) === filter
    );
  }, [events, filter]);

  const counts = useMemo(() => {
    return {
      All: events.length,
      Upcoming: events.filter(
        (event) =>
          getEventStatus(event.start_time, event.end_time) === 'Upcoming'
      ).length,
      Ongoing: events.filter(
        (event) =>
          getEventStatus(event.start_time, event.end_time) === 'Ongoing'
      ).length,
      Ended: events.filter(
        (event) =>
          getEventStatus(event.start_time, event.end_time) === 'Ended'
      ).length,
    };
  }, [events]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.primaryDark}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ADMINISTRATOR WORKSPACE</Text>
            <Text style={styles.pageTitle}>Event Monitoring</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh events"
            disabled={refreshing || loading}
            onPress={() => loadEvents(true)}
            style={styles.refreshButton}
          >
            {refreshing ? (
              <ActivityIndicator
                color={COLORS.primaryDark}
                size="small"
              />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.primaryDark}
              />
            )}
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Monitor school events, schedules, and recorded attendance.
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="calendar-outline"
              size={28}
              color={COLORS.primaryDark}
            />
          </View>

          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>TOTAL SCHOOL EVENTS</Text>
            <Text style={styles.summaryValue}>
              {loading ? '—' : events.length.toLocaleString()}
            </Text>
            <Text style={styles.summaryHint}>
              Events visible to your administrator account
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Event Status</Text>
        <Text style={styles.sectionSubtitle}>
          Choose a status to filter the event list.
        </Text>

        <View style={styles.filterContainer}>
          {(['All', 'Upcoming', 'Ongoing', 'Ended'] as FilterType[]).map(
            (item) => {
              const selected = filter === item;

              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filterButton,
                    selected && styles.filterButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.filterTextSelected,
                    ]}
                  >
                    {item}
                  </Text>

                  <Text
                    style={[
                      styles.filterCount,
                      selected && styles.filterCountSelected,
                    ]}
                  >
                    {counts[item]}
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.sectionTitle}>School Events</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredEvents.length} event
              {filteredEvents.length === 1 ? '' : 's'} shown
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.messageCard}>
            <ActivityIndicator
              size="large"
              color={COLORS.primaryDark}
            />
            <Text style={styles.messageTitle}>Loading events...</Text>
            <Text style={styles.messageText}>
              Please wait while we retrieve school events.
            </Text>
          </View>
        ) : error ? (
          <View style={styles.messageCard}>
            <Ionicons
              name="cloud-offline-outline"
              size={34}
              color={COLORS.warmText}
            />
            <Text style={styles.messageTitle}>
              Couldn’t load events
            </Text>
            <Text style={styles.messageText}>{error}</Text>

            <Pressable
              onPress={() => loadEvents()}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.messageCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={30}
                color={COLORS.primaryDark}
              />
            </View>
            <Text style={styles.messageTitle}>No events found</Text>
            <Text style={styles.messageText}>
              {filter === 'All'
                ? 'No school events are available yet.'
                : `There are no ${filter.toLowerCase()} events right now.`}
            </Text>
          </View>
        ) : (
          <View style={styles.eventList}>
            {filteredEvents.map((event) => {
              const status = getEventStatus(
                event.start_time,
                event.end_time
              );

              const statusStyle =
                status === 'Ongoing'
                  ? styles.statusOngoing
                  : status === 'Upcoming'
                    ? styles.statusUpcoming
                    : styles.statusEnded;

              const statusTextStyle =
                status === 'Ongoing'
                  ? styles.statusOngoingText
                  : status === 'Upcoming'
                    ? styles.statusUpcomingText
                    : styles.statusEndedText;

              const isExpanded = !!expandedEvents[event.id];
              const isAttendanceLoading =
                !!loadingAttendance[event.id];
              const attendanceError = attendanceErrors[event.id];
              const attendees = attendanceByEvent[event.id] ?? [];

              return (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <View style={styles.eventIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={23}
                        color={COLORS.primaryDark}
                      />
                    </View>

                    <View style={styles.eventHeading}>
                      <Text style={styles.eventTitle}>
                        {event.title || 'Untitled Event'}
                      </Text>
                      <Text style={styles.eventCode}>
                        Code: {event.event_code || 'Not available'}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, statusStyle]}>
                      <Text style={[styles.statusText, statusTextStyle]}>
                        {status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.eventDivider} />

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="play-circle-outline"
                      size={18}
                      color={COLORS.muted}
                    />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>START</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(event.start_time)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="stop-circle-outline"
                      size={18}
                      color={COLORS.muted}
                    />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>END</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(event.end_time)}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    accessibilityLabel={
                      isExpanded
                        ? `Hide attendance for ${event.title}`
                        : `Show attendance for ${event.title}`
                    }
                    onPress={() => toggleAttendance(event.id)}
                    style={({ pressed }) => [
                      styles.attendanceToggle,
                      pressed && styles.attendanceTogglePressed,
                    ]}
                  >
                    <View style={styles.attendanceToggleLeft}>
                      <View style={styles.attendanceIcon}>
                        <Ionicons
                          name="people-outline"
                          size={21}
                          color={COLORS.successText}
                        />
                      </View>

                      <View style={styles.attendanceToggleText}>
                        <Text style={styles.attendanceCountText}>
                          {event.attendeeCount} attendee
                          {event.attendeeCount === 1 ? '' : 's'}
                        </Text>
                        <Text style={styles.attendanceHint}>
                          {isExpanded
                            ? 'Tap to hide student records'
                            : 'Tap to view student records'}
                        </Text>
                      </View>
                    </View>

                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={COLORS.primaryDark}
                    />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.attendancePanel}>
                      <View style={styles.attendancePanelHeader}>
                        <Text style={styles.attendancePanelTitle}>
                          Attendance Records
                        </Text>
                        <Text style={styles.attendancePanelCount}>
                          {event.attendeeCount}
                        </Text>
                      </View>

                      {isAttendanceLoading ? (
                        <View style={styles.attendanceMessage}>
                          <ActivityIndicator
                            size="small"
                            color={COLORS.primaryDark}
                          />
                          <Text style={styles.attendanceMessageText}>
                            Loading student records...
                          </Text>
                        </View>
                      ) : attendanceError ? (
                        <View style={styles.attendanceMessage}>
                          <Ionicons
                            name="alert-circle-outline"
                            size={23}
                            color={COLORS.warmText}
                          />
                          <Text style={styles.attendanceErrorText}>
                            {attendanceError}
                          </Text>

                          <Pressable
                            style={styles.smallRetryButton}
                            onPress={() => loadEventAttendance(event.id)}
                          >
                            <Text style={styles.smallRetryText}>
                              Retry
                            </Text>
                          </Pressable>
                        </View>
                      ) : attendees.length === 0 ? (
                        <View style={styles.attendanceMessage}>
                          <Ionicons
                            name="people-outline"
                            size={28}
                            color={COLORS.muted}
                          />
                          <Text style={styles.noAttendanceTitle}>
                            No attendance yet
                          </Text>
                          <Text style={styles.attendanceMessageText}>
                            Students who scan this event’s QR code will
                            appear here.
                          </Text>
                        </View>
                      ) : (
                        attendees.map((attendee, index) => (
                          <View
                            key={attendee.id}
                            style={[
                              styles.attendeeRow,
                              index === attendees.length - 1 &&
                                styles.attendeeRowLast,
                            ]}
                          >
                            <View style={styles.attendeeNumber}>
                              <Text style={styles.attendeeNumberText}>
                                {index + 1}
                              </Text>
                            </View>

                            <View style={styles.attendeeInfo}>
                              <Text style={styles.attendeeName}>
                                {attendee.studentName}
                              </Text>
                              <Text style={styles.attendeeStudentId}>
                                {attendee.studentId
                                  ? `ID: ${attendee.studentId.slice(-8)}`
                                  : 'Student ID unavailable'}
                              </Text>
                              <View style={styles.attendeeTimeRow}>
                                <Ionicons
                                  name="time-outline"
                                  size={13}
                                  color={COLORS.muted}
                                />
                                <Text style={styles.attendeeTime}>
                                  {formatDateTime(attendee.scannedAt)}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.presentBadge}>
                              <Ionicons
                                name="checkmark-circle"
                                size={13}
                                color={COLORS.successText}
                              />
                              <Text style={styles.presentText}>
                                Present
                              </Text>
                            </View>
                          </View>
                        ))
                      )}

                      {!isAttendanceLoading && !attendanceError && (
                        <Pressable
                          style={styles.refreshAttendanceButton}
                          onPress={() => loadEventAttendance(event.id)}
                        >
                          <Ionicons
                            name="refresh-outline"
                            size={15}
                            color={COLORS.primaryDark}
                          />
                          <Text style={styles.refreshAttendanceText}>
                            Refresh attendance
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footerText}>
          QR Attendance · Event Monitoring
        </Text>
      </ScrollView>
    </SafeAreaView>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  refreshButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 13,
    marginBottom: 22,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 19,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryIcon: {
    width: 57,
    height: 57,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  summaryText: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: '900',
    color: COLORS.muted,
  },
  summaryValue: {
    marginTop: 3,
    fontSize: 29,
    fontWeight: '900',
    color: COLORS.text,
  },
  summaryHint: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.muted,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
  },
  sectionSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 15,
    marginBottom: 28,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterButtonSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  filterTextSelected: {
    color: COLORS.white,
  },
  filterCount: {
    minWidth: 20,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: COLORS.background,
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: '900',
  },
  filterCountSelected: {
    backgroundColor: COLORS.white,
    color: COLORS.primaryDark,
  },
  listHeader: {
    marginBottom: 15,
  },
  eventList: {
    gap: 14,
  },
  eventCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  eventIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventHeading: {
    flex: 1,
    paddingTop: 2,
  },
  eventTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  eventCode: {
    marginTop: 5,
    fontSize: 11,
    color: COLORS.muted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
  },
  statusOngoing: {
    backgroundColor: COLORS.success,
  },
  statusOngoingText: {
    color: COLORS.successText,
  },
  statusUpcoming: {
    backgroundColor: COLORS.warm,
  },
  statusUpcomingText: {
    color: COLORS.warmText,
  },
  statusEnded: {
    backgroundColor: COLORS.blueLight,
  },
  statusEndedText: {
    color: COLORS.primaryDark,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
  },
  eventDivider: {
    height: 1,
    backgroundColor: COLORS.line,
    marginVertical: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 13,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  detailValue: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.text,
  },
  attendanceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
    padding: 12,
    borderRadius: 15,
    backgroundColor: '#F0F8F5',
    borderWidth: 1,
    borderColor: '#DCEFE6',
  },
  attendanceTogglePressed: {
    opacity: 0.75,
  },
  attendanceToggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attendanceIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceToggleText: {
    flex: 1,
  },
  attendanceCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.successText,
  },
  attendanceHint: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.muted,
  },
  attendancePanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 15,
    backgroundColor: '#FAFCFD',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attendancePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  attendancePanelTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  attendancePanelCount: {
    minWidth: 25,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: COLORS.primary,
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  attendanceMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  attendanceMessageText: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    textAlign: 'center',
  },
  attendanceErrorText: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.warmText,
    textAlign: 'center',
  },
  noAttendanceTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  smallRetryButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
  },
  smallRetryText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    gap: 9,
  },
  attendeeRowLast: {
    borderBottomWidth: 0,
  },
  attendeeNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  attendeeNumberText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  attendeeStudentId: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.muted,
  },
  attendeeTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  attendeeTime: {
    flex: 1,
    fontSize: 10,
    color: COLORS.muted,
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.success,
  },
  presentText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.successText,
  },
  refreshAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 9,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  refreshAttendanceText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  messageCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  messageTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  messageText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.muted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 17,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  footerText: {
    marginTop: 28,
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.muted,
  },
});
