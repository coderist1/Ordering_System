import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { useNavigation } from '@react-navigation/native'
import { register } from '../api/client'
import { colors, radii, spacing, typography, shadows, typeScale } from '../theme/design'

export default function RegisterScreen() {
  const navigation = useNavigation<any>()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileUri, setProfileUri] = useState<string | null>(null)
  const [profileBase64, setProfileBase64] = useState<string | null>(null)
  const [profileMimeType, setProfileMimeType] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const profileInitials = useMemo(() => {
    const first = firstName.trim()[0] || ''
    const last = lastName.trim()[0] || ''
    const combined = `${first}${last}`.trim()
    if (combined) return combined.toUpperCase()
    const usernameInitial = username.trim()[0]
    return usernameInitial ? usernameInitial.toUpperCase() : 'U'
  }, [firstName, lastName, username])

  const pickProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      console.log('ImagePicker permission:', permission)
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Photo access is required to add a profile picture.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      })

      console.log('ImagePicker result:', result)
      if (result?.canceled) {
        return
      }

      const picked = result?.assets?.[0]
      if (picked?.uri) {
        setProfileUri(picked.uri)
        setProfileBase64(picked.base64 ?? null)
        setProfileMimeType(picked.mimeType ?? null)
      } else {
        Alert.alert('Error', 'No image selected or unable to read image URI.')
      }
    } catch (err) {
      console.error('pickProfilePhoto error:', err)
      Alert.alert('Error', 'Failed to pick photo. Check logs for details.')
    }
  }

  const handleRegister = async () => {
    setErrorMsg('')

    if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
      setErrorMsg('Please fill in all required fields.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const form = new FormData()
      form.append('first_name', firstName)
      form.append('last_name', lastName)
      form.append('email', email)
      form.append('username', username)
      form.append('password', password)
      form.append('confirm_password', confirmPassword)
      form.append('role', 'customer')

      if (profileUri) {
        const filename = profileUri.split('/').pop() || 'profile.jpg'
        const extension = (filename.match(/\.(\w+)$/)?.[1] || 'jpg').toLowerCase()
        const mimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'
        // If we have base64 (picked while online) prefer saving that for offline persistence
        if (profileBase64) {
          form.append('profile_image_base64', profileBase64)
          form.append('profile_image_type', profileMimeType || mimeType)
        } else {
          form.append('profile_image', {
            uri: profileUri,
            name: filename,
            type: mimeType,
          } as any)
        }
      }

      await register(form)

      navigation.navigate('ActivationPending', { email })
    } catch (e: any) {
      const msg = e?.response?.data
        ? Object.values(e.response.data).flat().join(', ')
        : e?.message || 'Registration failed'
      setErrorMsg(msg)

      // If network error (no response) save pending registration to AsyncStorage to upload later
      if (!e?.response) {
        try {
          const { savePendingRegistration } = await import('../utils/offlineUploads')
          const pendingPayload: any = {
            first_name: firstName,
            last_name: lastName,
            email,
            username,
            password,
            confirm_password: confirmPassword,
            role: 'customer',
          }
          if (profileBase64) {
            pendingPayload.profile_image_base64 = profileBase64
            pendingPayload.profile_image_type = profileMimeType || 'image/jpeg'
          }
          await savePendingRegistration(pendingPayload)
          Alert.alert('Offline', 'You appear to be offline. Registration will be completed once online.')
        } catch (saveErr) {
          console.error('Failed to save pending registration', saveErr)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerSection}>
            <Text style={styles.appName}>MY STORE</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Smart Ordering today</Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.formContainer}>
            <View style={styles.photoCard}>
              <TouchableOpacity style={styles.photoRing} onPress={pickProfilePhoto} activeOpacity={0.86}>
                {profileUri ? (
                  <Image source={{ uri: profileUri }} style={styles.photoImage} />
                ) : (
                  <View style={styles.photoFallback}>
                    <Text style={styles.photoFallbackText}>{profileInitials}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Optional profile photo</Text>
                <Text style={styles.photoSubtitle}>
                  Add a picture now, or skip it and finish your account first.
                </Text>

                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.photoButton} onPress={pickProfilePhoto} activeOpacity={0.88}>
                    <Text style={styles.photoButtonText}>{profileUri ? 'Change Photo' : 'Choose Photo'}</Text>
                  </TouchableOpacity>

                  {profileUri ? (
                    <TouchableOpacity style={styles.photoGhostButton} onPress={() => setProfileUri(null)} activeOpacity={0.88}>
                      <Text style={styles.photoGhostText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput 
                  style={styles.input} 
                  value={firstName} 
                  onChangeText={setFirstName} 
                  placeholderTextColor={colors.textMuted}
                  placeholder="First name"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput 
                  style={styles.input} 
                  value={lastName} 
                  onChangeText={setLastName} 
                  placeholderTextColor={colors.textMuted}
                  placeholder="Last name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
                placeholder="you@example.com"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username *</Text>
              <TextInput 
                style={styles.input} 
                value={username} 
                onChangeText={setUsername} 
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
                placeholder="username"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={colors.textMuted}
                  placeholder="Create a password"
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)} 
                  style={styles.eyeIcon}
                >
                  <Text>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={colors.textMuted}
                  placeholder="Confirm your password"
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                  style={styles.eyeIcon}
                >
                  <Text>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Pressable 
              style={[styles.registerButton, loading && styles.buttonDisabled]} 
              onPress={handleRegister} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </Pressable>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  headerSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  appName: {
    ...typography.caption,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: colors.error + '10',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  formContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  photoCard: {
    backgroundColor: colors.bgPrimary,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  photoRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.bgCard,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  photoFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: {
    ...typography.heading,
    color: colors.textInverse,
  },
  photoCopy: {
    flex: 1,
  },
  photoTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  photoSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  photoButtonText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
  photoGhostButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primary + '10',
  },
  photoGhostText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bgPrimary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: typeScale.body,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: spacing.xl,
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.sm,
  },
  registerButtonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.bodyBold,
    color: colors.primary,
  },
})