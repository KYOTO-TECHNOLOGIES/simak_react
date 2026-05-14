import { call, put, select, takeLatest } from "redux-saga/effects";
import { authApi } from "./authApi";
import { tokenManager } from "../../services/api";
import {
  requestOtp,
  verifyOtp,
  googleLogin,
  setStep,
  authError,
  setUser,
  setReferralMessage,
  checkAuth,
  checkAuthDone,
  setUnauthenticated,
  logout,
} from "./authSlice";
import { profileApi } from "../user/profileApi";

const getErrMsg = (err: any, fallback: string) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;

function* handleSendOtp(action: ReturnType<typeof requestOtp>): Generator<any, any, any> {
  try {
    // Build clean payload without undefined fields
    const payload: any = { otp_type: action.payload.otp_type };
    if (action.payload.phone_number) payload.phone_number = action.payload.phone_number;
    if (action.payload.email) payload.email = action.payload.email;
    if (action.payload.first_name) payload.first_name = action.payload.first_name;
    if (action.payload.last_name) payload.last_name = action.payload.last_name;
    if (action.payload.referral_code) payload.referral_code = action.payload.referral_code;
    if (action.payload.otp_platform) payload.otp_platform = action.payload.otp_platform;

    yield call(authApi.sendOtp, payload);
    yield put(setStep("otp"));
  } catch (err: any) {
    const msg = getErrMsg(err, "Failed to send OTP");
    const status = err?.response?.status;
    const data = err?.response?.data;

    // Detect inactive/blocked user from status code, response flag, or message keywords
    if (
      status === 403 ||
      data?.is_active === false ||
      /blocked|inactive|disabled|deactivated/i.test(msg)
    ) {
      yield put(authError("ACCOUNT_INACTIVE"));
    } else {
      yield put(authError(msg));
    }
  }
}

function* handleVerifyOtp(action: ReturnType<typeof verifyOtp>): Generator<any, any, any> {
  try {
    // Build clean payload without undefined fields
    const payload: any = { otp_type: action.payload.otp_type, otp_code: action.payload.otp_code };
    if (action.payload.phone_number) payload.phone_number = action.payload.phone_number;
    if (action.payload.email) payload.email = action.payload.email;
    if (action.payload.name) payload.name = action.payload.name;
    if (action.payload.first_name) payload.first_name = action.payload.first_name;
    if (action.payload.last_name) payload.last_name = action.payload.last_name;
    if (action.payload.referral_code) payload.referral_code = action.payload.referral_code;

    // ✅ verifies OTP & server returns access token + sets session cookie
    const verifyRes: { data: any } = yield call(authApi.verifyOtp, payload);

    // ✅ Extract access token from response and store it
    const accessToken = verifyRes.data?.access || verifyRes.data?.accessToken || verifyRes.data?.token;
    if (accessToken) {
      tokenManager.set(accessToken);
    }

    // ✅ Get user from verify response directly to ensure we get the Verified status instantly
    let user = verifyRes.data?.user ?? verifyRes.data;

    // ✅ If verify response didn't have user, fetch it now that we have the token
    if (!user || (!user.id && !user.email && !user.phone_number)) {
      const res: { data: any } = yield call(authApi.me);
      user = res.data?.user ?? res.data;
    }

    // ✅ VERIFICATION FLAGS: Backend automatically sets is_email_verified or is_phone_verified on successful OTP
    // Just confirm they're set by fetching fresh user data
    if (user?.id) {
      try {
        const meRes: { data: any } = yield call(authApi.me);
        user = meRes.data?.user ?? meRes.data;

        // ✅ Verify the flags are actually persisted
        if (action.payload.otp_type === 'email') {
          if (user?.is_email_verified) {
            console.log("[Auth] ✅ CONFIRMED: is_email_verified is TRUE in /me/ response");
          } else {
            console.warn("[Auth] ⚠️ WARNING: is_email_verified is not true in /me/ response");
          }
        } else if (action.payload.otp_type === 'phone') {
          if (user?.is_phone_verified) {
            console.log("[Auth] ✅ CONFIRMED: is_phone_verified is TRUE in /me/ response");
          } else {
            console.warn("[Auth] ⚠️ WARNING: is_phone_verified is not true in /me/ response");
          }
        }
      } catch (meErr: any) {
        console.error("[Auth] Failed to fetch /users/me/ after OTP:", meErr?.response?.data || meErr?.message);
        // Continue with user data from verify response
      }
    }

    // If names were provided in registration but are missing in backend response, save them now
    if (user?.id && (!user.first_name || !user.last_name) && (action.payload.first_name || action.payload.last_name)) {
      try {
        const updateRes: { data: any } = yield call(profileApi.updateProfile, user.id, {
          first_name: user.first_name || action.payload.first_name || "",
          last_name: user.last_name || action.payload.last_name || "",
        });
        if (updateRes?.data || updateRes) {
          user = { ...user, ...(updateRes.data ?? updateRes) };
        }
      } catch (updateErr) {
        console.error("[AuthSaga] Auto-save registration names failed:", updateErr);
        // Fallback: merge locally if API update failed
        if (!user.first_name && action.payload.first_name) user.first_name = action.payload.first_name;
        if (!user.last_name && action.payload.last_name) user.last_name = action.payload.last_name;
      }
    }

    // ✅ Force Query Cache sync
    import("../../main").then(({ queryClient }) => {
      queryClient.setQueryData(["userProfile"], user);
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    });

    // ✅ store in redux (UI/guard will redirect)
    yield put(setUser(user));

    // ✅ Capture referral success message if present
    const referralMsg = verifyRes.data?.referral?.message || verifyRes.data?.referral_message || verifyRes.data?.referral_success;
    if (referralMsg) {
      yield put(setReferralMessage(referralMsg));
    }
  } catch (err: any) {
    yield put(authError(getErrMsg(err, "Invalid OTP")));
  }
}

function* handleGoogleLogin(action: ReturnType<typeof googleLogin>): Generator<any, any, any> {
  try {
    const { credential, referral_code } = action.payload;
    const res: { data: any } = yield call(authApi.googleCallback, {
      code: credential,
      referral_code: referral_code || undefined,
    });

    // Extract and store access token
    const accessToken = res.data?.access || res.data?.accessToken || res.data?.token;
    if (accessToken) {
      tokenManager.set(accessToken);
    }

    // Get user from response or fetch from /me
    let user = res.data?.user ?? res.data;
    if (!user || (!user.id && !user.email)) {
      const meRes: { data: any } = yield call(authApi.me);
      user = meRes.data?.user ?? meRes.data;
    }

    // Sync query cache
    import("../../main").then(({ queryClient }) => {
      queryClient.setQueryData(["userProfile"], user);
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    });

    yield put(setUser(user));

    // ✅ Capture referral success message if present
    const referralMsg = res.data?.referral?.message || res.data?.referral_message || res.data?.referral_success;
    if (referralMsg) {
      yield put(setReferralMessage(referralMsg));
    }
  } catch (err: any) {
    const msg = getErrMsg(err, "Google login failed");
    yield put(authError(msg));
  }
}

function* handleCheckAuth(): Generator<any, any, any> {
  try {
    // ✅ Skip if user is already authenticated (e.g. just verified OTP)
    const alreadyAuthenticated: boolean = yield select((state: any) => state.auth.isAuthenticated);
    if (alreadyAuthenticated) {
      yield put(checkAuthDone());
      return;
    }

    // ✅ Check if we even have a token locally before calling API
    const hasToken = tokenManager.get();
    if (!hasToken) {
      yield put(setUnauthenticated());
      yield put(checkAuthDone());
      return;
    }

    // ✅ Call /users/me to restore session on page load/refresh
    const res: { data: any } = yield call(authApi.me);
    const user = res.data?.user ?? res.data;
    yield put(setUser(user));
  } catch (err: any) {
    // No valid session, clear auth state
    yield put(setUnauthenticated());
  } finally {
    yield put(checkAuthDone());
  }
}

function* handleLogout(): Generator<any, any, any> {
  try {
    // ✅ Call backend to clear the refresh cookie
    yield call(authApi.logout);
  } catch (_err) {
    // Even if the API fails, we still clear the local state
  } finally {
    // ✅ Clear in-memory access token
    tokenManager.clear();
    // ✅ Clear Redux auth state (keeps checkingAuth=false so routes render)
    yield put(setUnauthenticated());
  }
}

export function* authSaga(): Generator<any, any, any> {
  yield takeLatest(requestOtp.type, handleSendOtp);
  yield takeLatest(verifyOtp.type, handleVerifyOtp);
  yield takeLatest(googleLogin.type, handleGoogleLogin);
  yield takeLatest(checkAuth.type, handleCheckAuth);
  yield takeLatest(logout.type, handleLogout);
}
