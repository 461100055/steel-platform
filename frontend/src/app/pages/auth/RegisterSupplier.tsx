import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Shield,
  Calendar,
  Clock3,
  Home,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { PLATFORM_LOGO } from '../../lib/constants';
import { checkEmailExists, normalizeEmail, registerUser } from '../../lib/api';

type SupplierForm = {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  city: string;
  description: string;
  image: string;

  license_number: string;
  license_date: string;

  commercial_register_number: string;
  commercial_register_date: string;
};

const initialForm: SupplierForm = {
  email: '',
  password: '',
  confirm_password: '',
  first_name: '',
  last_name: '',
  company: '',
  phone: '',
  city: '',
  description: '',
  image: '',

  license_number: '',
  license_date: '',

  commercial_register_number: '',
  commercial_register_date: '',
};

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseEmailExistsResult(result: any): boolean {
  if (typeof result === 'boolean') return result;

  if (result?.exists === true) return true;
  if (result?.is_registered === true) return true;
  if (result?.available === false) return true;

  return false;
}

function extractErrorMessage(error: any, fallback: string) {
  if (!error) return fallback;

  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.detail) return error.detail;
  if (error?.error) return error.error;

  if (typeof error === 'object') {
    const firstKey = Object.keys(error)[0];
    const value = error[firstKey];

    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }

    if (typeof value === 'string') {
      return value;
    }
  }

  return fallback;
}

export default function RegisterSupplier() {
  const [form, setForm] = useState<SupplierForm>(initialForm);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const steps = [
    { number: 1, title: 'Business Info', icon: Building2 },
    { number: 2, title: 'Contact', icon: User },
    { number: 3, title: 'Profile', icon: FileText },
    { number: 4, title: 'Security', icon: Shield },
  ];

  const displayStep = submittedEmail ? 4 : currentStep;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    const nextValue = name === 'phone' ? sanitizeDigits(value) : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    if (name === 'email') {
      setEmailVerified(false);
    }

    if (error) {
      setError('');
    }
  };

  const validateEmailAvailability = async () => {
    const normalized = normalizeEmail(form.email);

    if (!normalized) {
      setError('Email address is required.');
      setEmailVerified(false);
      return false;
    }

    if (!isValidEmail(normalized)) {
      setError('Please enter a valid email address.');
      setEmailVerified(false);
      return false;
    }

    setCheckingEmail(true);
    setError('');

    try {
      const result = await checkEmailExists(normalized);
      const emailExists = parseEmailExistsResult(result);

      if (emailExists) {
        setError('This email is already registered.');
        setEmailVerified(false);
        return false;
      }

      setEmailVerified(true);
      return true;
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to check email availability.'));
      setEmailVerified(false);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const validateStep = async (step: number) => {
    setError('');

    if (step === 1) {
      const normalizedEmail = normalizeEmail(form.email);

      if (!normalizedEmail) {
        setError('Email address is required.');
        return false;
      }

      if (!isValidEmail(normalizedEmail)) {
        setError('Please enter a valid email address.');
        return false;
      }

      const emailIsAvailable = await validateEmailAvailability();

      if (!emailIsAvailable) {
        return false;
      }

      if (!form.company.trim()) {
        setError('Company name is required.');
        return false;
      }

      if (!form.commercial_register_number.trim()) {
        setError('Commercial register number is required.');
        return false;
      }

      if (!form.commercial_register_date) {
        setError('Commercial register date is required.');
        return false;
      }

      if (!form.license_number.trim()) {
        setError('Professional license number is required.');
        return false;
      }

      if (!form.license_date) {
        setError('Professional license date is required.');
        return false;
      }

      return true;
    }

    if (step === 2) {
      if (!form.phone.trim()) {
        setError('Phone number is required.');
        return false;
      }

      if (form.phone.trim().length < 8) {
        setError('Please enter a valid phone number.');
        return false;
      }

      if (!form.city.trim()) {
        setError('City is required.');
        return false;
      }

      return true;
    }

    if (step === 3) {
      if (!form.first_name.trim()) {
        setError('First name is required.');
        return false;
      }

      if (!form.last_name.trim()) {
        setError('Last name is required.');
        return false;
      }

      return true;
    }

    if (step === 4) {
      if (!form.password) {
        setError('Password is required.');
        return false;
      }

      if (form.password.length < 8) {
        setError('Password must be at least 8 characters.');
        return false;
      }

      if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) {
        setError('Password must include letters and numbers.');
        return false;
      }

      if (!form.confirm_password) {
        setError('Please confirm your password.');
        return false;
      }

      if (form.password !== form.confirm_password) {
        setError('Passwords do not match.');
        return false;
      }

      return true;
    }

    return true;
  };

  const handleNext = async () => {
    const valid = await validateStep(currentStep);

    if (!valid) return;

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const valid = await validateStep(4);
    if (!valid) return;

    setLoading(true);
    setError('');

    const normalizedEmail = normalizeEmail(form.email);

    try {
      await registerUser({
        role: 'supplier',

        // لا يظهر في الواجهة، لكنه يرسل للباكند لتفادي أي خطأ إذا كان username مطلوبًا
        username: normalizedEmail,

        email: normalizedEmail,
        password: form.password,
        password_confirm: form.confirm_password,
        confirm_password: form.confirm_password,

        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),

        supplier_description: form.description.trim(),
        description: form.description.trim(),

        supplier_categories: ['Steel'],
        supplier_image: form.image.trim(),
        image: form.image.trim(),

        license_number: form.license_number.trim(),
        license_date: form.license_date,

        commercial_register_number: form.commercial_register_number.trim(),
        commercial_register_date: form.commercial_register_date,
      });

      setSubmittedEmail(normalizedEmail);
      setForm(initialForm);
      setEmailVerified(false);
      setCurrentStep(4);
    } catch (err: any) {
      const message = extractErrorMessage(
        err,
        'Registration failed. Please try again.'
      );
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderBusinessInfoStep = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            onBlur={validateEmailAvailability}
            className="border-[#E5E7EB] bg-white pl-10"
            placeholder="supplier@company.com"
          />
        </div>

        {checkingEmail && (
          <p className="text-xs text-[#4988C4]">Checking email availability...</p>
        )}

        {!error && emailVerified && !checkingEmail && (
          <p className="text-xs text-green-600">This email is available.</p>
        )}
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="company">
          Company Name <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="company"
            name="company"
            value={form.company}
            onChange={handleChange}
            className="border-[#E5E7EB] bg-white pl-10"
            placeholder="Enter company name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="commercial_register_number">
          Commercial Register Number <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="commercial_register_number"
            name="commercial_register_number"
            value={form.commercial_register_number}
            onChange={handleChange}
            className="border-[#E5E7EB] bg-white pl-10"
            placeholder="Enter commercial register number"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="commercial_register_date">
          Commercial Register Date <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="commercial_register_date"
            name="commercial_register_date"
            type="date"
            value={form.commercial_register_date}
            onChange={handleChange}
            className="border-[#E5E7EB] bg-white pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="license_number">
          Professional License Number <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="license_number"
            name="license_number"
            value={form.license_number}
            onChange={handleChange}
            className="border-[#E5E7EB] bg-white pl-10"
            placeholder="Enter license number"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="license_date">
          Professional License Date <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="license_date"
            name="license_date"
            type="date"
            value={form.license_date}
            onChange={handleChange}
            className="border-[#E5E7EB] bg-white pl-10"
          />
        </div>
      </div>
    </div>
  );

  const renderContactStep = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            inputMode="numeric"
            className="border-[#E5E7EB] bg-white pl-10"
            placeholder="Numbers only"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">
          City <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="city"
            name="city"
            value={form.city}
            onChange={handleChange}
            className="border-[#E5E7EB] bg-white pl-10"
            placeholder="Enter city"
          />
        </div>
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="first_name">
          First Name <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="first_name"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            className="border-[#E5E7EB] bg-white pl-10"
            placeholder="First name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="last_name">
          Last Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="last_name"
          name="last_name"
          value={form.last_name}
          onChange={handleChange}
          className="border-[#E5E7EB] bg-white"
          placeholder="Last name"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Company Description</Label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#6B7280]" />
          <Input
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            className="border-[#E5E7EB] bg-white pl-10"
            placeholder="Short description about your company"
          />
        </div>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="image">Image URL</Label>
        <div className="relative">
          <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            id="image"
            name="image"
            value={form.image}
            onChange={handleChange}
            className="border-[#E5E7EB] bg-white pl-10"
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </div>
    </div>
  );

  const renderSecurityStep = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="password">
          Password <span className="text-red-500">*</span>
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          className="border-[#E5E7EB] bg-white"
          placeholder="Minimum 8 characters"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">
          Confirm Password <span className="text-red-500">*</span>
        </Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          value={form.confirm_password}
          onChange={handleChange}
          className="border-[#E5E7EB] bg-white"
          placeholder="Re-enter your password"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex flex-col items-center justify-center gap-3">
          <Link to="/" className="inline-flex items-center justify-center">
            <img
              src={PLATFORM_LOGO}
              alt="Steel Platform"
              className="h-16 w-auto object-contain"
            />
          </Link>

          <Link
            to="/"
            className="text-sm font-medium text-[#1C4D8D] transition-colors hover:text-[#0F2854]"
          >
            Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const isActive = displayStep === item.number;
              const isCompleted = displayStep > item.number || Boolean(submittedEmail);

              return (
                <div key={item.number} className="flex flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors ${
                        isCompleted
                          ? 'border-[#0F2854] bg-[#0F2854] text-white'
                          : isActive
                          ? 'border-[#0F2854] bg-white text-[#0F2854]'
                          : 'border-[#E5E7EB] bg-white text-[#6B7280]'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>

                    <span
                      className={`mt-2 text-center text-sm font-medium ${
                        isActive ? 'text-[#0F2854]' : 'text-[#6B7280]'
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>

                  {index < steps.length - 1 && (
                    <div
                      className={`mx-4 mb-8 h-0.5 flex-1 ${
                        displayStep > item.number || submittedEmail
                          ? 'bg-[#0F2854]'
                          : 'bg-[#E5E7EB]'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card className="border-[#E5E7EB] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#0F2854]">Register as Supplier</CardTitle>
            <CardDescription>
              Create a supplier account to list products, receive orders, and connect with buyers.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submittedEmail ? (
              <div className="space-y-6">
                <Alert className="border-[#F59E0B] bg-[#FFF7ED]">
                  <Clock3 className="h-4 w-4 text-[#D97706]" />
                  <AlertDescription className="text-sm text-[#7C2D12]">
                    Your supplier registration request has been submitted successfully and is currently under admin review.
                    Your account will not be activated automatically until the administrator approves it.
                  </AlertDescription>
                </Alert>

                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />

                  <h2 className="text-xl font-semibold text-[#0F2854]">
                    Request Under Review
                  </h2>

                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">
                    Thank you for registering as a supplier. Your request is now pending review by the admin team.
                    You will be notified by email or SMS once your account is approved or rejected.
                    If the request is rejected, the rejection reason will be provided by the administrator.
                  </p>

                  <p className="mt-4 text-sm font-medium text-[#111827]">
                    Submitted Email: {submittedEmail}
                  </p>

                  <div className="mt-6">
                    <Button asChild className="bg-[#0F2854] hover:bg-[#1C4D8D]">
                      <Link to="/">
                        <Home className="mr-2 h-4 w-4" />
                        Back to Home
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <Alert className="border-[#F59E0B] bg-[#FFF7ED]">
                  <Clock3 className="h-4 w-4 text-[#D97706]" />
                  <AlertDescription className="text-sm text-[#7C2D12]">
                    Supplier accounts require admin approval before sign in.
                    Your email, license, and commercial register information will be reviewed after registration.
                  </AlertDescription>
                </Alert>

                {currentStep === 1 && renderBusinessInfoStep()}
                {currentStep === 2 && renderContactStep()}
                {currentStep === 3 && renderProfileStep()}
                {currentStep === 4 && renderSecurityStep()}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1 || loading || checkingEmail}
                    className="border-[#E5E7EB]"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  {currentStep < 4 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={loading || checkingEmail}
                      className="bg-[#0F2854] hover:bg-[#1C4D8D]"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={checkingEmail || loading}
                      className="bg-[#0F2854] hover:bg-[#1C4D8D]"
                    >
                      {loading ? 'Submitting Request...' : 'Submit for Review'}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {!submittedEmail && (
              <div className="mt-6 text-center text-sm">
                <span className="text-[#6B7280]">Already have an account? </span>
                <Link to="/login" className="text-[#4988C4] hover:underline">
                  Sign In
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}