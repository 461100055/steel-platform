import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { PLATFORM_LOGO } from '../../lib/constants';
import type { UserRole } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';

function isBuyerRole(role: UserRole | undefined | null) {
  return (
    role === 'buyer' ||
    role === 'buyer_individual' ||
    role === 'buyer_company' ||
    role === 'buyer_establishment'
  );
}

function extractErrorMessage(error: any, fallback: string) {
  if (!error) return fallback;

  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.detail) return error.detail;
  if (error?.error) return error.error;

  return fallback;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // لم نعد نعرض اختيار Buyer / Supplier / Admin في الواجهة.
  // نترك القيمة الافتراضية للباكند/الـ AuthContext، ثم يتم التوجيه حسب الدور الحقيقي الراجع من السيرفر.
  const defaultRole: UserRole = 'buyer';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const successMessage = (location.state as { message?: string; email?: string } | null)?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    try {
      setLoading(true);

      const loggedInUser = await login(email.trim(), password, defaultRole);

      if (isBuyerRole(loggedInUser?.role)) {
        navigate('/buyer/dashboard');
        return;
      }

      if (loggedInUser?.role === 'supplier') {
        navigate('/supplier/dashboard');
        return;
      }

      if (loggedInUser?.role === 'admin') {
        navigate('/admin/dashboard');
        return;
      }

      navigate('/buyer/dashboard');
    } catch (err: any) {
      setError(
        extractErrorMessage(
          err,
          'Login failed. Please check your email and password.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center">
          <img
            src={PLATFORM_LOGO}
            alt="Steel Platform"
            className="h-24 w-auto object-contain"
          />
        </Link>

        {successMessage && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  required
                  disabled={loading}
                  className="border-[#E5E7EB] bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  required
                  disabled={loading}
                  className="border-[#E5E7EB] bg-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <Link
                  to="/forgot-password"
                  className="text-sm text-[#4988C4] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F2854] hover:bg-[#1C4D8D]"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <div className="mb-2 text-[#6B7280]">
                Don&apos;t have an account?
              </div>

              <Link to="/register/buyer" className="text-[#4988C4] hover:underline">
                Register as Buyer
              </Link>

              <span className="mx-1 text-[#6B7280]">or</span>

              <Link to="/register-supplier" className="text-[#4988C4] hover:underline">
                Register as Supplier
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}