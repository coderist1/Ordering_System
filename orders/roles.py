"""Shared role helpers — canonical role name for customers is ``customer``."""

CUSTOMER_ROLE = 'customer'
OWNER_ROLE = 'owner'
ADMIN_ROLE = 'admin'

VALID_ROLES = {CUSTOMER_ROLE, OWNER_ROLE, ADMIN_ROLE}
ROLE_ALIASES = {'user': CUSTOMER_ROLE}


def normalize_role(role):
    if not role:
        return CUSTOMER_ROLE
    role = str(role).strip().lower()
    return ROLE_ALIASES.get(role, role)


def get_role(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return CUSTOMER_ROLE
    try:
        return normalize_role(user.profile.role)
    except Exception:
        return CUSTOMER_ROLE


def is_customer(user):
    return get_role(user) == CUSTOMER_ROLE


def is_owner(user):
    return get_role(user) == OWNER_ROLE


def is_admin(user):
    return get_role(user) == ADMIN_ROLE


def is_staff(user):
    return get_role(user) in {ADMIN_ROLE, OWNER_ROLE}
