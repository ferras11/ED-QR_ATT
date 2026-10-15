
import { supabase } from './supabase';
import { parseQRPayload } from './qr';
import { getEventByCode } from './events';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    studentName: string | null;
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export type AdminAttendanceRecord = {
  id: string;
  eventId: string;
  eventCode: string;
  eventTitle: string;
  studentId: string;
  studentName: string | null;
  teacherName: string | null;
  scannedAt: string;
};

export type AdminDashboardStats = {
  totalStudents: number;
  totalTeachers: number;
  totalEvents: number;
  totalAttendance: number;
};

// Register a student's attendance using the scanned QR payload.
export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);

  if (!parsed.ok) {
    return {
      success: false,
      message: parsed.message,
    };
  }

  const payload = parsed.payload;
  const now = Date.now();

  const start = payload.start
    ? new Date(payload.start).getTime()
    : null;

  const end = payload.end
    ? new Date(payload.end).getTime()
    : null;

  if (start !== null && now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
    };
  }

  if (end !== null && now > end) {
    return {
      success: false,
      message: 'Event has already ended.',
    };
  }

  const title = payload.title ?? payload.event;

  let event: { id: string; title: string } | null = null;

  const foundEvent = await getEventByCode(payload.event);

  if (foundEvent) {
    event = foundEvent;
  } else {
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert([
        {
          event_code: payload.event,
          title,
          start_time: payload.start ?? null,
          end_time: payload.end ?? null,
        },
      ])
      .select('id, title')
      .single();

    if (insertError || !newEvent) {
      console.error(
        'Could not create attendance event:',
        insertError
      );

      return {
        success: false,
        message: 'Could not create event.',
      };
    }

    event = newEvent;
  }

  const { error: attendanceError } = await supabase
    .from('attendance')
    .insert([
      {
        student_id: studentId,
        event_id: event.id,
      },
    ]);

  if (attendanceError) {
    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
      };
    }

    console.error(
      'Could not register attendance:',
      attendanceError
    );

    return {
      success: false,
      message: attendanceError.message,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: event.title,
  };
}

// Get the attendance history of a specific student.
export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    if (error) {
      console.error(
        'Unable to load student attendance history:',
        error
      );
    }

    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
  }));
}

// Get events created by a teacher and their attendees.
export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    if (eventError) {
      console.error(
        'Unable to load teacher events:',
        eventError
      );
    }

    return [];
  }

  const eventIds = events.map((event: any) => event.id);

  if (eventIds.length === 0) {
    return [];
  }

  const { data: attendance, error: attendanceError } =
    await supabase
      .from('attendance')
      .select('student_id, scanned_at, event_id')
      .in('event_id', eventIds)
      .order('scanned_at', { ascending: false });

  if (attendanceError) {
    console.error(
      'Unable to load teacher event attendance:',
      attendanceError
    );
  }

  const attendanceRows = attendance ?? [];

  const studentIds = [
    ...new Set(
      attendanceRows.map(
        (record: any) => record.student_id as string
      )
    ),
  ];

  const profileMap: Record<string, string | null> = {};

  if (studentIds.length > 0) {
    const { data: profiles, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

    if (profileError) {
      console.error(
        'Unable to load attendee profiles:',
        profileError
      );
    }

    for (const profile of profiles ?? []) {
      profileMap[profile.id] = profile.full_name ?? null;
    }
  }

  return events.map((event: any) => {
    const rows = attendanceRows.filter(
      (record: any) => record.event_id === event.id
    );

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: rows.length,
      attendees: rows.map((record: any) => ({
        studentId: record.student_id,
        studentName: profileMap[record.student_id] ?? null,
        scannedAt: record.scanned_at,
      })),
    };
  });
}

// Get event summaries for a specific teacher.
export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    if (eventError) {
      console.error(
        'Unable to load teacher event summaries:',
        eventError
      );
    }

    return [];
  }

  const eventIds = events.map((event: any) => event.id);

  if (eventIds.length === 0) {
    return [];
  }

  const { data: attendanceRows, error: attendanceError } =
    await supabase
      .from('attendance')
      .select('event_id')
      .in('event_id', eventIds);

  if (attendanceError) {
    console.error(
      'Unable to load event attendance counts:',
      attendanceError
    );
  }

  const counts: Record<string, number> = {};

  (attendanceRows ?? []).forEach((record: any) => {
    counts[record.event_id] =
      (counts[record.event_id] ?? 0) + 1;
  });

  return events.map((event: any) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}

// Get all attendance records for the admin history screen.
export async function getAdminAttendanceHistory(): Promise<
  AdminAttendanceRecord[]
> {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      student_id,
      scanned_at,
      events (
        id,
        event_code,
        title,
        created_by
      )
    `)
    .order('scanned_at', { ascending: false });

  if (error) {
    console.error(
      'Unable to load admin attendance history:',
      error
    );
    throw error;
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return [];
  }

  const profileIds = [
    ...new Set(
      rows.flatMap((row: any) => {
        const ids: string[] = [];

        if (row.student_id) {
          ids.push(row.student_id);
        }

        const event = Array.isArray(row.events)
          ? row.events[0]
          : row.events;

        if (event?.created_by) {
          ids.push(event.created_by);
        }

        return ids;
      })
    ),
  ];

  const profileMap: Record<string, string | null> = {};

  if (profileIds.length > 0) {
    const { data: profiles, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds);

    if (profileError) {
      console.error(
        'Unable to load admin history profile names:',
        profileError
      );
      throw profileError;
    }

    for (const profile of profiles ?? []) {
      profileMap[profile.id] = profile.full_name ?? null;
    }
  }

  return rows.map((row: any) => {
    const event = Array.isArray(row.events)
      ? row.events[0]
      : row.events;

    return {
      id: row.id,
      // Database UUID used for filtering.
      eventId: event?.id ?? '',
      // Human-readable event code used for display/search.
      eventCode: event?.event_code ?? '',
      eventTitle: event?.title ?? 'Unknown Event',
      studentId: row.student_id,
      studentName: profileMap[row.student_id] ?? null,
      teacherName: event?.created_by
        ? profileMap[event.created_by] ?? null
        : null,
      scannedAt: row.scanned_at,
    };
  });
}

// Get live totals for the admin dashboard.
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    studentsResult,
    teachersResult,
    eventsResult,
    attendanceResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student'),

    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'teacher'),

    supabase
      .from('events')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true }),
  ]);

  const error =
    studentsResult.error ??
    teachersResult.error ??
    eventsResult.error ??
    attendanceResult.error;

  if (error) {
    console.error(
      'Unable to load admin dashboard stats:',
      error
    );
    throw error;
  }

  return {
    totalStudents: studentsResult.count ?? 0,
    totalTeachers: teachersResult.count ?? 0,
    totalEvents: eventsResult.count ?? 0,
    totalAttendance: attendanceResult.count ?? 0,
  };
}
