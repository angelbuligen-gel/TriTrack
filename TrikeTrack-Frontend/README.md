# TrikeTrack Frontend

React 19 + Vite application for the TrikeTrack franchise processing system. It talks to the
Laravel REST API only — never to MySQL directly.

## Scripts

```sh
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Configuration

`.env`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_APP_NAME=TrikeTrack
```

## Structure

```
src/
├── components/   Alert, Button, OtpInput, TextField
├── context/      AuthContext (raw context) + AuthProvider
├── hooks/        useAuth, useCountdown
├── layouts/      AuthLayout (public), AppLayout (signed-in shell)
├── pages/
│   ├── auth/     Login, Register, VerifyOtp, RegistrationSuccess
│   ├── franchisee/ Dashboard
│   └── staff/    StaffHome
├── routes/       GuestRoute, ProtectedRoute (role-aware)
├── services/     api (Axios instance), authService
├── utils/        format, roles
├── App.jsx
└── main.jsx
```

## Authentication

Sanctum bearer tokens are stored in `localStorage` under `tritrack_token`. Axios attaches
the token to every request; a `401` clears the session and returns the user to the login
page. Route protection is enforced in React **and** on the Laravel side.

## OTP verification screen

`/verify-otp` shows the masked mobile number, six separate digit inputs with paste support,
a live code-expiry countdown, a resend button with cooldown, and a “change mobile number”
link. Registration details are kept in `sessionStorage` so a page refresh does not lose the
flow.

## Roles

`franchisee`, `bplo`, `treasury`, `administrator`. Franchisees land on `/app`, staff on
`/staff` (their module pages arrive in later modules).
