
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profiles';

export default function ScanScreen() {
  const { user } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadProfile() {
        setRoleLoading(true);

        if (!user) {
          setRole(null);
          setRoleLoading(false);
          return;
        }

        try {
          const profile = await getProfile(user.id);

          if (active) {
            setRole(profile?.role ?? null);
          }
        } catch (error) {
          console.error('Loading scanner access failed:', error);

          if (active) {
            setRole(null);
          }
        } finally {
          if (active) {
            setRoleLoading(false);
          }
        }
      }

      loadProfile();

      return () => {
        active = false;
      };
    }, [user])
  );

  const handleBarcodeScanned = async ({
    data,
  }: {
    data: string;
  }) => {
    if (scanned || processing || !user || role !== 'student') return;

    setScanned(true);
    setProcessing(true);
    setLastData(data);
    setMessage(null);

    try {
      const result = await registerAttendance(data, user.id);

      setMessage(result.message);
      setSuccess(result.success);
    } catch {
      setMessage(
        'Something went wrong while recording attendance. Please try again.'
      );
      setSuccess(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setLastData(null);
    setMessage(null);
    setSuccess(false);
    setProcessing(false);
  };

  // Check the account role before showing the camera or requesting permission.
  if (roleLoading) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.permissionSubtitle}>
          Checking your account...
        </Text>
      </View>
    );
  }

  // Only student accounts can access the QR scanner.
  if (!user || role !== 'student') {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={46}
            color={COLORS.textSecondary}
          />
        </View>

        <Text style={styles.permissionTitle}>Students Only</Text>

        <Text style={styles.permissionSubtitle}>
          Only student accounts can access the QR scanner and record
          attendance. Please log in with a student account to continue.
        </Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.permissionSubtitle}>
          Preparing your camera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIcon}>
          <Ionicons
            name="camera-outline"
            size={42}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.permissionTitle}>
          Camera Permission Needed
        </Text>

        <Text style={styles.permissionSubtitle}>
          Allow camera access to scan event QR codes and record
          your attendance.
        </Text>

        <AppButton
          theme="primary"
          title="Grant Camera Permission"
          icon="camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.topOverlay}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="qr-code-outline"
              size={23}
              color={COLORS.textPrimary}
            />
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <Text style={styles.headerSubtitle}>QR Attendance</Text>
          </View>
        </View>

        <Text style={styles.instruction}>
          {scanned
            ? 'QR code detected'
            : 'Position the QR code inside the frame'}
        </Text>
      </View>

      {!scanned && (
        <View pointerEvents="none" style={styles.scannerArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <View style={styles.scanHint}>
            <Ionicons
              name="scan-outline"
              size={17}
              color={COLORS.textOnPrimary}
            />
            <Text style={styles.scanHintText}>Ready to scan</Text>
          </View>
        </View>
      )}

      <View style={styles.bottomPanel}>
        {processing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.resultTitle}>
              Recording Attendance
            </Text>
            <Text style={styles.resultDescription}>
              Please wait while we process your scan.
            </Text>
          </View>
        ) : scanned ? (
          <>
            <View
              style={[
                styles.resultIcon,
                success ? styles.successIcon : styles.errorIcon,
              ]}
            >
              <Ionicons
                name={
                  success
                    ? 'checkmark-circle-outline'
                    : 'alert-circle-outline'
                }
                size={31}
                color={success ? '#2E7D32' : '#C62828'}
              />
            </View>

            <Text style={styles.resultTitle}>
              {success ? 'Attendance Recorded' : 'Scan Unsuccessful'}
            </Text>

            <Text
              style={[
                styles.resultMessage,
                success ? styles.successText : styles.errorText,
              ]}
            >
              {message ?? 'Unable to confirm the attendance result.'}
            </Text>

            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>Scanned QR Data</Text>
              <Text style={styles.dataValue} numberOfLines={3}>
                {lastData}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.scanAgainButton,
                pressed && styles.pressed,
              ]}
              onPress={handleScanAgain}
              accessibilityRole="button"
            >
              <Ionicons
                name="refresh-outline"
                size={20}
                color={COLORS.textOnPrimary}
              />
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.readyHeader}>
              <View style={styles.readyIcon}>
                <Ionicons
                  name="scan-outline"
                  size={23}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.readyTextContainer}>
                <Text style={styles.readyTitle}>Ready to scan</Text>
                <Text style={styles.readyDescription}>
                  Hold your phone steady and make sure the entire QR code
                  is visible.
                </Text>
              </View>
            </View>

            <View style={styles.tipContainer}>
              <Ionicons
                name="bulb-outline"
                size={17}
                color={COLORS.textSecondary}
              />
              <Text style={styles.tipText}>
                Make sure you are scanning the correct event QR code.
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101418',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 13,
    gap: 12,
  },
  headerIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  instruction: {
    alignSelf: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(13, 27, 42, 0.78)',
    color: COLORS.textOnPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 22,
    overflow: 'hidden',
  },
  scannerArea: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 248,
    height: 248,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: COLORS.textOnPrimary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 13,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 13,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 13,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 13,
  },
  scanHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 19,
    backgroundColor: 'rgba(13, 27, 42, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  scanHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 22,
    paddingTop: 23,
    paddingBottom: 28,
  },
  readyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  readyIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyTextContainer: {
    flex: 1,
  },
  readyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  readyDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 19,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  resultIcon: {
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIcon: {
    backgroundColor: '#E8F5E9',
  },
  errorIcon: {
    backgroundColor: '#FFEBEE',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  resultDescription: {
    fontSize: 13,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 7,
  },
  resultMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 13,
  },
  successText: {
    color: '#2E7D32',
  },
  errorText: {
    color: '#C62828',
  },
  dataContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 15,
  },
  dataLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  dataValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  scanAgainButton: {
    minHeight: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  scanAgainText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionIcon: {
    width: 82,
    height: 82,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  permissionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
});
