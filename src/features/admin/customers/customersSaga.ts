import { call, put, select, takeEvery, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { customersApi } from "./customersApi";
import { customersActions } from "./customersSlice";
import type { Customer, UserDto } from "./customersApi";
import type { RootState } from "../../../app/store";
import { setUser } from "../../auth/authSlice";
import { normalizeMediaUrl } from "../../../utils/media";

function mapUserDtoToCustomer(dto: UserDto): Customer {
  const firstName = dto.first_name || "";
  const lastName = dto.last_name || "";
  let name = `${firstName} ${lastName}`.trim();
  if (!name) name = dto.full_name || dto.phone_number || "Unknown";
  const normalizedStatus = (dto.status || "").toLowerCase();
  const isInactive = dto.is_active === false || dto.isActive === false;
  const isBlocked =
    normalizedStatus === "blocked" ||
    normalizedStatus === "inactive" ||
    normalizedStatus === "suspended" ||
    isInactive;

  return {
    id: String(dto.id),
    name,
    email: dto.email || "",
    phone: dto.phone_number || "",
    role: dto.role,
    status: isBlocked ? "Blocked" : "Active",
    isDeleted: !!dto.deleted_at,
    isEmailVerified: dto.is_email_verified,
    isPhoneVerified: dto.is_phone_verified,
    googleLinked: !!dto.google_id,
    profilePicture: normalizeMediaUrl(dto.profile?.profile_picture),
    dateOfBirth: dto.profile?.date_of_birth ?? null,
    gender: dto.profile?.gender ?? null,
    preferredLanguage: dto.profile?.preferred_language ?? "en",
    newsletterSubscribed: dto.profile?.newsletter_subscribed ?? false,
    notificationEnabled: dto.profile?.notification_enabled ?? false,
    lastLoginAt: dto.last_login_at,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    deletedAt: dto.deleted_at,
    addresses: dto.addresses ?? [],
  };
}

/** Normalize any API shape -> Customer[] */
function normalizeCustomers(payload: any): Customer[] {
  if (Array.isArray(payload?.results)) {
    return payload.results.map(mapUserDtoToCustomer);
  }
  if (Array.isArray(payload)) return payload.map((item: any) => mapUserDtoToCustomer(item));
  if (Array.isArray(payload?.data)) return payload.data.map((item: any) => mapUserDtoToCustomer(item));
  return [];
}

/* ── Fetch customers (supports showDeleted toggle) ── */
function* fetchCustomersWorker(
  action: ReturnType<typeof customersActions.fetchCustomersRequest>
): SagaIterator {
  try {
    const auth: any = yield select((state: RootState) => (state as any).auth);

    if (auth && auth.isAuthenticated === false) {
      yield put(customersActions.fetchCustomersFailure("User not authenticated"));
      return;
    }

    const showDeleted: boolean = yield select(
      (state: RootState) => (state as any).customers?.showDeleted ?? false
    );

    const fetcher = showDeleted ? customersApi.listAll : customersApi.list;
    const raw: any = yield call(fetcher, action.payload);
    const totalCount = raw?.count || 0;
    const items = normalizeCustomers(raw);
    const page = action.payload?.page || 1;

    yield put(
      customersActions.fetchCustomersSuccess({
        items,
        totalCount,
        page,
      })
    );
  } catch (e: any) {
    console.error("Fetch Customers Error:", {
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });

    const errMsg =
      e?.response?.data?.detail ||
      e?.response?.data?.message ||
      e?.message ||
      "Failed to fetch customers";

    yield put(customersActions.fetchCustomersFailure(errMsg));
  }
}

/* ── Generic action worker (block, unblock, delete, restore, set-role) ── */
function* actionWorker(
  action: ReturnType<typeof customersActions.actionRequest>
): SagaIterator {
  const { type: actionType, id, payload: actionPayload } = action.payload;

  try {
    switch (actionType) {
      case "block":
        yield call(customersApi.blockUser, id);
        break;
      case "unblock":
        yield call(customersApi.unblockUser, id);
        break;
      case "softDelete":
        yield call(customersApi.softDelete, id);
        break;
      case "restore":
        yield call(customersApi.restore, id);
        break;
      case "setRole":
        yield call(customersApi.setRole, id, actionPayload?.role);
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    yield put(customersActions.actionSuccess(actionType));

    // Re-fetch list so table updates
    const lastQuery: any = yield select(
      (state: RootState) => (state as any).customers?.lastQuery
    );
    yield put(customersActions.fetchCustomersRequest(lastQuery ?? undefined));
  } catch (e: any) {
    console.error(`Customer action "${actionType}" failed:`, e);
    const errMsg =
      e?.response?.data?.detail ||
      e?.response?.data?.message ||
      e?.message ||
      `Failed to ${actionType} user`;
    yield put(customersActions.actionFailure(errMsg));
  }
}

/* ── Re-fetch after auth (admin only) ── */
function* retryCustomersOnAuth(action: ReturnType<typeof setUser>): SagaIterator {
  // Only fetch customers list for admin users
  const user = action.payload;
  const isAdmin = user?.role === "admin" || user?.is_admin === true;
  if (!isAdmin) return;

  const lastQuery: any = yield select(
    (state: RootState) => (state as any).customers?.lastQuery
  );

  yield put(customersActions.fetchCustomersRequest(lastQuery ?? undefined));
}

export function* customersSaga(): SagaIterator {
  yield takeLatest(customersActions.fetchCustomersRequest.type, fetchCustomersWorker);
  yield takeLatest(customersActions.actionRequest.type, actionWorker);
  yield takeEvery(setUser.type, retryCustomersOnAuth);
}
