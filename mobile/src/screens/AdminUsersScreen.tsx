import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchUsers, updateUserRole } from '../api/client';
import { colors, radii, spacing, typography, shadows } from '../theme/design';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

const ROLE_OPTIONS = ['customer', 'owner', 'admin'] as const;
type RoleOption = typeof ROLE_OPTIONS[number];

const ROLE_COLORS: Record<RoleOption, string> = {
  customer: colors.statusCompleted,
  owner: colors.statusProcessing,
  admin: colors.statusShipped,
};

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<Array<User & { role?: string }>>([]);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  
  const loadUsers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await fetchUsers();
      const data = res.data?.users ?? res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onSetRole = async (userId: number, role: RoleOption) => {
    Alert.alert(
      'Change Role',
      `Are you sure you want to change this user's role to ${role.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdatingId(userId);
            try {
              await updateUserRole(userId, role);
              await loadUsers(true);
            } catch (e) {
              Alert.alert('Error', 'Failed to update user role');
            } finally {
              setUpdatingId(null);
            }
          }
        }
      ]
    );
  };

  const getInitials = (username: string) => {
    return username ? username.charAt(0).toUpperCase() : '?';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadUsers(true);
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.storeName}>MY STORE</Text>
            <Text style={styles.title}>User Management</Text>
            <Text style={styles.subtitle}>Manage user roles and permissions</Text>
            <View style={styles.adminInfo}>
              <Text style={styles.adminText}>Logged in as: {user?.username}</Text>
              <View style={styles.adminRoleBadge}>
                <Text style={styles.adminRoleText}>Admin</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const currentRole = (item.role || 'customer').toLowerCase() as RoleOption;
          const isUpdating = updatingId === item.id;
          
          return (
            <View style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[currentRole] }]}>
                    <Text style={styles.avatarText}>{getInitials(item.username)}</Text>
                  </View>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{item.username}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                  <View style={[styles.rolePill, { backgroundColor: ROLE_COLORS[currentRole] + '15' }]}>
                    <Text style={[styles.rolePillText, { color: ROLE_COLORS[currentRole] }]}>
                      {currentRole.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionsContainer}>
                <Text style={styles.actionsLabel}>Change Role:</Text>
                <View style={styles.roleButtons}>
                  {ROLE_OPTIONS.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        currentRole === role && styles.roleButtonActive,
                        isUpdating && styles.buttonDisabled,
                      ]}
                      onPress={() => onSetRole(item.id, role)}
                      disabled={isUpdating || currentRole === role}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          currentRole === role && styles.roleButtonTextActive,
                        ]}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {isUpdating && (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.updatingIndicator} />
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  listContent: {
    padding: spacing.md,
  },
  header: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  storeName: {
    ...typography.caption,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  adminText: {
    ...typography.caption,
    color: colors.primary,
  },
  adminRoleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  adminRoleText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  userCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    color: colors.textInverse,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  email: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  rolePillText: {
    ...typography.caption,
    fontWeight: 'bold',
  },
  actionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  actionsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: colors.textInverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  updatingIndicator: {
    marginTop: spacing.sm,
  },
});