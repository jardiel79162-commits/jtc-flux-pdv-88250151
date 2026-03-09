import { useState, useEffect, useRef, useCallback } from "react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { generateDeviceFingerprint } from "@/lib/fingerprint";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Gift, Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronRight, ChevronLeft, HelpCircle, ExternalLink, ShoppingCart, Package, TrendingUp, Check, MapPin, Ticket, User, Info, Shield, Sparkles, Lock, Truck } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { signIn, signUp, type SignUpData, validateInviteCode } from "@/lib/auth";
import { isValidCPF, isValidCNPJ } from "@/lib/cpfValidator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { fetchCEP, fetchEstados, fetchCidades, type Estado, type Cidade } from "@/lib/location";
import JTCCaptcha from "@/components/JTCCaptcha";
import { motion, AnimatePresence } from "framer-motion";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth state
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login state
  const [showUnconfirmedEmailUI, setShowUnconfirmedEmailUI] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [showBlockedAccountDialog, setShowBlockedAccountDialog] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [signupExpired, setSignupExpired] = useState(false);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);


  // Register state
  const [registerStep, setRegisterStep] = useState(1);
  const [accountCreated, setAccountCreated] = useState(false);
  const [docType, setDocType] = useState<"cpf" | "cnpj">("cpf");
  const [gender, setGender] = useState<"masculino" | "feminino" | "">("");
  const [businessType, setBusinessType] = useState<"comercio" | "loja_roupas" | "delivery">("comercio");
  const [formData, setFormData] = useState({
    fullName: "",
    cpf: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    cep: "",
    number: "",
  });
  const [addressData, setAddressData] = useState({
    street: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  // Persist form data for 24h (survives refresh/offline)
  const { clearPersisted: clearFormPersist } = useFormPersistence("auth_register", formData, setFormData);
  const { clearPersisted: clearAddressPersist } = useFormPersistence("auth_address", addressData, setAddressData);
  const [selectedEstado, setSelectedEstado] = useState("");
  const [selectedCidade, setSelectedCidade] = useState("");
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [isFetchingCEP, setIsFetchingCEP] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [cpfAvailable, setCpfAvailable] = useState<boolean | null>(null);
  const [isCheckingCpf, setIsCheckingCpf] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);
  const cpfCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Invite code
  const [hasInviteCode, setHasInviteCode] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [codeValidationStatus, setCodeValidationStatus] = useState<"idle" | "valid" | "invalid" | "used">("idle");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  useEffect(() => {
    fetchEstados().then(setEstados);
  }, []);

  useEffect(() => {
    if (selectedEstado) {
      fetchCidades(selectedEstado).then(setCidades);
    } else {
      setCidades([]);
    }
  }, [selectedEstado]);

  // Countdown timer for unconfirmed email
  useEffect(() => {
    if (!showUnconfirmedEmailUI || !unconfirmedEmail) return;

    const fetchCreatedAt = async () => {
      const { data } = await (supabase.rpc as any)('get_profile_created_at_by_email', { p_email: unconfirmedEmail });
      if (!data || data.length === 0) return;

      const createdAt = new Date(data[0].created_at);
      const expiryDate = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

      const interval = setInterval(() => {
        const now = new Date();
        const diff = expiryDate.getTime() - now.getTime();

        if (diff <= 0) {
          clearInterval(interval);
          setSignupExpired(true);
          setCountdown(null);
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ hours, minutes, seconds });
      }, 1000);

      return () => clearInterval(interval);
    };

    fetchCreatedAt();
  }, [showUnconfirmedEmailUI, unconfirmedEmail]);

  const handleResendConfirmationEmail = async (email?: string) => {
    const targetEmail = email || formData.email;
    if (!targetEmail) return;

    setIsResendingConfirmation(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: targetEmail });
      if (error) throw error;
      toast({ title: "E-mail reenviado!", description: "Verifique sua caixa de entrada e a pasta de spam." });
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível reenviar o e-mail." });
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  const validateCode = async (code: string) => {
    if (code.length < 6) {
      setCodeValidationStatus("idle");
      return;
    }
    setIsValidatingCode(true);
    const result = await validateInviteCode(code);
    if (result.valid) {
      setCodeValidationStatus("valid");
    } else if (result.alreadyUsed) {
      setCodeValidationStatus("used");
    } else {
      setCodeValidationStatus("invalid");
    }
    setIsValidatingCode(false);
  };

  const handleInviteCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setInviteCode(upperValue);
    if (upperValue.length >= 6) {
      validateCode(upperValue);
    } else {
      setCodeValidationStatus("idle");
    }
  };

  const handleCEPChange = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      setIsFetchingCEP(true);
      const data = await fetchCEP(cleanCEP);
      if (data) {
        setAddressData(prev => ({
          ...prev,
          city: data.localidade,
          state: data.uf,
        }));
        setSelectedEstado(data.uf);
        setSelectedCidade(data.localidade);
        toast({ title: "CEP encontrado!", description: "Endereço preenchido automaticamente." });
      } else {
        toast({ variant: "destructive", title: "CEP não encontrado", description: "Verifique o CEP digitado." });
      }
      setIsFetchingCEP(false);
    }
  };

  const formatCPFInput = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    let formatted = v;
    if (v.length > 3) formatted = v.slice(0, 3) + "." + v.slice(3);
    if (v.length > 6) formatted = formatted.slice(0, 7) + "." + formatted.slice(7);
    if (v.length > 9) formatted = formatted.slice(0, 11) + "-" + formatted.slice(11);
    return formatted;
  };

  const formatCNPJInput = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 14) v = v.slice(0, 14);
    let formatted = v;
    if (v.length > 2) formatted = v.slice(0, 2) + "." + v.slice(2);
    if (v.length > 5) formatted = formatted.slice(0, 6) + "." + formatted.slice(6);
    if (v.length > 8) formatted = formatted.slice(0, 10) + "/" + formatted.slice(10);
    if (v.length > 12) formatted = formatted.slice(0, 15) + "-" + formatted.slice(15);
    return formatted;
  };

  const formatDocInput = (value: string) => {
    return docType === "cpf" ? formatCPFInput(value) : formatCNPJInput(value);
  };

  const formatPhone = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    let formatted = v;
    if (v.length > 0) formatted = "(" + v;
    if (v.length > 2) formatted = "(" + v.slice(0, 2) + ") " + v.slice(2);
    if (v.length > 7) formatted = "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7);
    return formatted;
  };

  const formatCEPInput = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) return v.slice(0, 5) + "-" + v.slice(5);
    return v;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    const formDataEvent = new FormData(e.currentTarget);
    const identifier = formDataEvent.get("identifier") as string;
    const password = formDataEvent.get("password") as string;

    try {
      const cleanIdentifier = identifier.replace(/\D/g, "");
      const isCPF = /^\d{11}$/.test(cleanIdentifier);

      if (isCPF) {
        const { data: isBlocked } = await (supabase.rpc as any)('is_cpf_blocked', { check_cpf: cleanIdentifier });
        if (isBlocked) {
          setShowBlockedAccountDialog(true);
          setIsLoading(false);
          return;
        }
      }

      await signIn(identifier, password);
      
      // Check if user is blocked
      const { data: { session: loginSession } } = await supabase.auth.getSession();
      if (loginSession) {
        const { data: userProfile } = await supabase.from('profiles').select('is_blocked').eq('user_id', loginSession.user.id).single();
        if (userProfile && (userProfile as any).is_blocked) {
          await supabase.auth.signOut();
          setAuthError("Sua conta foi suspensa pelo administrador.");
          setIsLoading(false);
          return;
        }
        
        // Check if system admin - redirect to admin panel
        const { data: isSysAdmin } = await (supabase.rpc as any)('is_system_admin', { _user_id: loginSession.user.id });
        if (isSysAdmin) {
          toast({ title: "Bem-vindo, Administrador!", description: "Redirecionando para o painel administrativo." });
          navigate("/admin");
          return;
        }
      }
      
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage = error.message?.toLowerCase() || "";
      if (errorMessage.includes("email not confirmed") || errorMessage.includes("email_not_confirmed")) {
        const formDataEvent2 = new FormData(e.currentTarget);
        const usedIdentifier = formDataEvent2.get("identifier") as string;
        const cleanId = usedIdentifier.replace(/\D/g, "");
        const isCPF = /^\d{11}$/.test(cleanId);

        if (isCPF) {
          const { data } = await (supabase.rpc as any)('get_user_email_by_cpf', { search_cpf: cleanId });
          if (data && data.length > 0) setUnconfirmedEmail(data[0].email);
        } else {
          setUnconfirmedEmail(usedIdentifier);
        }
        setShowUnconfirmedEmailUI(true);
      } else if (errorMessage.includes("invalid login credentials") || errorMessage.includes("invalid_credentials") || errorMessage.includes("invalid api key") || errorMessage.includes("invalid claim")) {
        setAuthError("E-mail/CPF ou senha incorretos. Verifique seus dados e tente novamente.");
      } else if (errorMessage.includes("cpf não encontrado")) {
        setAuthError("CPF não encontrado. Verifique se digitou corretamente ou crie uma conta.");
      } else if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("failed")) {
        setAuthError("Erro de conexão. Verifique sua internet e tente novamente.");
      } else {
        setAuthError("E-mail/CPF ou senha incorretos. Verifique seus dados e tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateAccount = () => {
    const message = encodeURIComponent("Olá 👋 gostaria de solicitar a reativação da minha conta do JTC FLUX PDV 🔄💻. Desde já, agradeço 🙏");
    window.open(`https://wa.me/5598981091476?text=${message}`, "_blank");
    setShowBlockedAccountDialog(false);
  };

  const getEmailProvider = (email: string): "gmail" | "outlook" | "unknown" => {
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes("@gmail.com")) return "gmail";
    if (lowerEmail.includes("@outlook.com") || lowerEmail.includes("@hotmail.com") || lowerEmail.includes("@live.com")) return "outlook";
    return "unknown";
  };

  const isValidEmailProvider = (email: string): boolean => {
    const provider = getEmailProvider(email);
    return provider === "gmail" || provider === "outlook";
  };

  const openEmailApp = () => {
    const provider = getEmailProvider(formData.email);
    if (provider === "gmail") window.open("https://mail.google.com", "_blank");
    else if (provider === "outlook") window.open("https://outlook.live.com", "_blank");
  };

  const checkCpfAvailability = useCallback(async (cleanDoc: string) => {
    setIsCheckingCpf(true);
    try {
      const { data, error } = await (supabase.rpc as any)('check_cpf_available', { p_cpf: cleanDoc });
      if (!error) {
        setCpfAvailable(data === true);
        if (data === false) setCpfError(`${docType.toUpperCase()} já cadastrado`);
      }
    } catch { /* ignore */ }
    setIsCheckingCpf(false);
  }, [docType]);

  const checkEmailAvailability = useCallback(async (email: string) => {
    setIsCheckingEmail(true);
    try {
      const { data, error } = await (supabase.rpc as any)('check_email_available', { p_email: email });
      if (!error) {
        setEmailAvailable(data === true);
        if (data === false) setEmailError("Este e-mail já está cadastrado");
      }
    } catch { /* ignore */ }
    setIsCheckingEmail(false);
  }, []);

  const checkPhoneAvailability = useCallback(async (phone: string) => {
    setIsCheckingPhone(true);
    try {
      const { data, error } = await (supabase.rpc as any)('check_phone_available', { p_phone: phone });
      if (!error) {
        setPhoneAvailable(data === true);
        if (data === false) setPhoneError("Este telefone já está cadastrado");
      }
    } catch { /* ignore */ }
    setIsCheckingPhone(false);
  }, []);

  const fetchCNPJData = useCallback(async (cnpj: string) => {
    setIsFetchingCNPJ(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (response.ok) {
        const data = await response.json();
        const nome = data.nome_fantasia || data.razao_social || "";
        if (nome) {
          setFormData(prev => ({ ...prev, fullName: nome }));
          toast({ title: "CNPJ encontrado!", description: `Empresa: ${nome}` });
        }
      }
    } catch { /* ignore */ }
    setIsFetchingCNPJ(false);
  }, [toast]);

  const validateStep1 = () => {
    if (!formData.fullName.trim()) { setAuthError(docType === "cnpj" ? "Nome fantasia da empresa é obrigatório." : "Nome completo é obrigatório."); return false; }
    const docValue = formData.cpf.replace(/\D/g, "");
    if (docType === "cpf") {
      if (!isValidCPF(docValue)) { setAuthError("CPF inválido. Verifique os números digitados."); return false; }
    } else {
      if (!isValidCNPJ(docValue)) { setAuthError("CNPJ inválido. Verifique os números digitados."); return false; }
    }
    if (cpfAvailable === false) { setAuthError(`${docType.toUpperCase()} já cadastrado. Use outro ou faça login.`); return false; }
    if (docType === "cpf" && !gender) { setAuthError("Selecione seu sexo."); return false; }
    setAuthError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!formData.email.includes("@")) { setAuthError("E-mail inválido. Digite um e-mail válido."); return false; }
    if (!isValidEmailProvider(formData.email)) { setAuthError("Só aceitamos e-mails @gmail.com ou @outlook.com."); return false; }
    if (emailAvailable === false) { setAuthError("Este e-mail já está cadastrado. Use outro ou faça login."); return false; }
    const phoneValue = formData.phone.replace(/\D/g, "");
    if (phoneValue.length !== 11) { setAuthError("Telefone deve ter 11 dígitos (DDD + número)."); return false; }
    if (phoneAvailable === false) { setAuthError("Este telefone já está cadastrado."); return false; }
    if (formData.password.length < 6) { setAuthError("Senha deve ter no mínimo 6 caracteres."); return false; }
    if (formData.password !== formData.confirmPassword) { setAuthError("As senhas não coincidem. Verifique e tente novamente."); return false; }
    setAuthError(null);
    return true;
  };

  const validateStep3 = () => {
    const cepValue = formData.cep.replace(/\D/g, "");
    if (cepValue.length !== 8) { setAuthError("CEP inválido. Digite um CEP com 8 dígitos."); return false; }
    if (!addressData.street.trim()) { setAuthError("Rua é obrigatória."); return false; }
    if (!formData.number.trim()) { setAuthError("Número é obrigatório."); return false; }
    if (!addressData.neighborhood.trim()) { setAuthError("Bairro é obrigatório."); return false; }
    if (!selectedEstado) { setAuthError("Estado é obrigatório."); return false; }
    if (!selectedCidade) { setAuthError("Cidade é obrigatória."); return false; }
    setAuthError(null);
    return true;
  };

  const handleNextStep = () => {
    setAuthError(null);
    if (registerStep === 1 && validateStep1()) setRegisterStep(2);
    else if (registerStep === 2 && validateStep2()) setRegisterStep(3);
    else if (registerStep === 3 && validateStep3()) setRegisterStep(4);
    else if (registerStep === 4) {
      // Business type step - just advance
      setRegisterStep(5);
    }
    else if (registerStep === 5) {
      if (hasInviteCode === null) {
        setAuthError("Selecione se possui código de convite.");
        return;
      }
      if (hasInviteCode && inviteCode && codeValidationStatus !== "valid") {
        setAuthError("Código de convite inválido.");
        return;
      }
      setCaptchaVerified(false);
      setRegisterStep(6);
    }
  };

  const handleGoToEmailVerification = async () => {
    if (hasInviteCode && inviteCode && codeValidationStatus !== "valid") {
      setAuthError("Código de convite inválido. Verifique e tente novamente.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const cpfValue = formData.cpf.replace(/\D/g, "");
      const { data: isBlocked, error: blockError } = await (supabase.rpc as any)('is_cpf_blocked', { check_cpf: cpfValue });
      if (!blockError && isBlocked) {
        setAuthError("Este CPF está bloqueado e não pode ser utilizado para criar uma nova conta.");
        setIsLoading(false);
        return;
      }

      if (hasInviteCode && inviteCode && codeValidationStatus === "valid") {
        try {
          const response = await supabase.functions.invoke('validate-invite-ip', {
            body: { invite_code: inviteCode, action: 'check' }
          });
          if (!response.error && !response.data.can_use) {
            setAuthError(response.data.message || "Este dispositivo já utilizou este código de convite.");
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Erro ao verificar IP:', error);
        }
      }

      const data: SignUpData = {
        fullName: formData.fullName,
        cpf: cpfValue,
        email: formData.email,
        phone: formData.phone,
        cep: formData.cep,
        street: addressData.street,
        number: formData.number,
        neighborhood: addressData.neighborhood,
        city: selectedCidade,
        state: selectedEstado,
        password: formData.password,
        gender: gender || undefined,
        referredByCode: hasInviteCode && codeValidationStatus === "valid" ? inviteCode : undefined,
      };

      await signUp(data);

      if (hasInviteCode && inviteCode && codeValidationStatus === "valid") {
        // Register IP usage (existing)
        await supabase.functions.invoke('validate-invite-ip', {
          body: { invite_code: inviteCode, action: 'register' }
        });

        // Register referral with anti-fraud system
        try {
          const fingerprint = await generateDeviceFingerprint();
          const { data: { session: newSession } } = await supabase.auth.getSession();
          await supabase.functions.invoke('register-referral', {
            body: {
              referral_code: inviteCode,
              referred_user_id: newSession?.user?.id || null,
              referred_email: data.email,
              device_fingerprint: fingerprint,
              user_agent: navigator.userAgent,
            }
          });
        } catch (referralError) {
          console.error('Erro ao registrar indicação antifraude:', referralError);
          // Não bloqueia o cadastro se falhar
        }
      }

      clearFormPersist();
      clearAddressPersist();

      // Auto-confirm está ativado, então fazemos login automático
      await signIn(data.email, data.password);
      
      // Save business_type to store_settings
      const { data: { session: newSess } } = await supabase.auth.getSession();
      if (newSess) {
        await supabase.from("store_settings").upsert({
          user_id: newSess.user.id,
          business_type: businessType,
        }, { onConflict: "user_id" });
      }
      
      toast({ title: "Conta criada!", description: "Bem-vindo ao JTC FluxPDV!" });
      navigate("/dashboard");

    } catch (error: any) {
      const errorMsg = (error.message || "").toLowerCase();
      if (errorMsg.includes("já está cadastrado") || errorMsg.includes("esqueceu sua senha")) {
        setAuthError("Este e-mail já está cadastrado. Se você esqueceu sua senha, tente recuperá-la na tela de login.");
      } else if (
        errorMsg.includes("já existe um usuário cadastrado") ||
        errorMsg.includes("user already registered") ||
        errorMsg.includes("email address is already registered") ||
        errorMsg.includes("already been registered")
      ) {
        setAuthError("Este e-mail ou CPF já está em uso. Se você já se cadastrou, verifique seu e-mail (e spam) para confirmar. Após 24 horas sem confirmação, o cadastro será liberado.");
      } else {
        setAuthError(error.message || "Não foi possível criar sua conta. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousStep = () => {
    if (registerStep > 1) setRegisterStep(registerStep - 1);
  };

  const resetForm = () => {
    clearFormPersist();
    clearAddressPersist();
    setRegisterStep(1);
    setDocType("cpf");
    setFormData({ fullName: "", cpf: "", email: "", phone: "", password: "", confirmPassword: "", cep: "", number: "" });
    setAddressData({ street: "", neighborhood: "", city: "", state: "" });
    setSelectedEstado("");
    setSelectedCidade("");
    setHasInviteCode(null);
    setInviteCode("");
    setCodeValidationStatus("idle");
    setAccountCreated(false);
    setCaptchaVerified(false);
    setCpfAvailable(null);
    setEmailAvailable(null);
    setEmailError(null);
    setPhoneAvailable(null);
    setPhoneError(null);
    setGender("");
  };

  const StepIndicator = ({ step, label, icon: Icon }: { step: number; label: string; icon: any }) => (
    <motion.div 
      className="flex flex-col items-center gap-1.5"
      initial={false}
      animate={registerStep === step ? { scale: 1.1 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <motion.div 
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-500 ${
          registerStep === step
            ? "bg-gradient-to-br from-primary to-[hsl(229,100%,72%)] text-white shadow-lg shadow-primary/40 ring-2 ring-primary/20"
            : registerStep > step
              ? "bg-gradient-to-br from-accent to-accent/80 text-white shadow-md shadow-accent/25"
              : "bg-white/[0.03] text-[#4a5478] border border-white/[0.06]"
        }`}
        layout
      >
        <AnimatePresence mode="wait">
          {registerStep > step ? (
            <motion.div key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 300 }}>
              <Check className="w-4.5 h-4.5" />
            </motion.div>
          ) : (
            <motion.div key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 300 }}>
              <Icon className="w-4.5 h-4.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
        registerStep === step ? "text-primary" : registerStep > step ? "text-accent" : "text-[#3a4060]"
      }`}>
        {label}
      </span>
    </motion.div>
  );

  return (
    <div className="auth-page-bg">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
        <div className="auth-orb auth-orb-4" />
        <div className="auth-grid-overlay" />
        {/* Floating particles — minimal */}
        {Array.from({ length: 12 }).map((_, i) => {
          const size = 1 + Math.random() * 1.5;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                background: i % 3 === 0 
                  ? 'hsl(229 100% 70% / 0.35)' 
                  : i % 3 === 1 
                  ? 'hsl(260 80% 70% / 0.2)' 
                  : 'hsl(163 100% 50% / 0.15)',
                left: `${8 + Math.random() * 84}%`,
                top: `${8 + Math.random() * 84}%`,
              }}
              animate={{
                y: [0, -(10 + Math.random() * 20), 0],
                opacity: [0.05, 0.4, 0.05],
              }}
              transition={{
                duration: 6 + Math.random() * 10,
                repeat: Infinity,
                delay: Math.random() * 6,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Branding section */}
        <motion.div 
          className="hidden lg:flex flex-col justify-center space-y-8 p-6"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <motion.div 
                className="relative group"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
              >
                <div className="absolute -inset-5 bg-gradient-to-r from-[hsl(229,100%,55%/0.3)] via-[hsl(260,80%,55%/0.15)] to-[hsl(163,100%,44%/0.2)] rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-all duration-700" />
                <img src={logo} alt="JTC FluxPDV" className="relative w-24 h-24 rounded-full object-cover shadow-2xl ring-1 ring-white/10" style={{ pointerEvents: 'auto' }} />
              </motion.div>
              <div className="space-y-1">
                <h1 className="text-5xl xl:text-6xl font-black tracking-tight leading-none">
                  <span className="text-white/90">JTC</span>
                  <span className="bg-gradient-to-r from-[hsl(229,100%,65%)] via-[hsl(260,80%,65%)] to-[hsl(163,100%,50%)] bg-clip-text text-transparent"> FluxPDV</span>
                </h1>
                <p className="text-[#5a6480] font-light text-sm tracking-wide">
                  Sistema completo de gestão para sua loja
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { icon: ShoppingCart, title: "PDV Rápido e Intuitivo", desc: "Vendas em segundos com interface simplificada", gradient: "from-[hsl(229,100%,55%)] to-[hsl(229,100%,70%)]", bg: "from-[hsl(229,100%,55%/0.08)] to-transparent", border: "border-[hsl(229,100%,55%/0.1)]" },
              { icon: Package, title: "Controle de Estoque", desc: "Gerencie produtos e fornecedores facilmente", gradient: "from-[hsl(163,100%,44%)] to-[hsl(163,100%,55%)]", bg: "from-[hsl(163,100%,44%/0.06)] to-transparent", border: "border-[hsl(163,100%,44%/0.08)]" },
              { icon: TrendingUp, title: "Relatórios Inteligentes", desc: "Métricas e insights para seu negócio crescer", gradient: "from-[hsl(260,80%,60%)] to-[hsl(260,80%,72%)]", bg: "from-[hsl(260,80%,60%/0.06)] to-transparent", border: "border-[hsl(260,80%,60%/0.08)]" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
                className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${item.bg} border ${item.border} transition-all duration-500 hover:border-white/10 group cursor-default`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#d0d8f0]">{item.title}</h3>
                  <p className="text-[#5a6480] text-xs">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-[hsl(163,100%,44%/0.06)] to-transparent border border-[hsl(163,100%,44%/0.1)]"
          >
            <motion.div 
              className="w-10 h-10 rounded-xl bg-[hsl(163,100%,44%/0.1)] flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            >
              <Gift className="w-4.5 h-4.5 text-[hsl(163,100%,50%)]" />
            </motion.div>
            <div>
              <p className="font-bold text-xs text-[#d0d8f0]">Programa de Indicação</p>
              <p className="text-xs text-[#5a6480]">
                Convide amigos e ganhe <span className="text-[hsl(163,100%,50%)] font-bold">1 mês grátis</span>!
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
        >
        <Card className="auth-card">
          <div className="auth-card-glow-tr" />
          <div className="auth-card-glow-bl" />

          <CardHeader className="text-center pb-2 pt-7 relative z-10">
            <div className="flex flex-col items-center gap-3 mb-1">
              <motion.div 
                className="relative group"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 180, delay: 0.4 }}
              >
                <div className="auth-logo-glow" />
                <img src={logo} alt="JTC FluxPDV" className="relative w-24 h-24 rounded-full object-cover shadow-xl ring-1 ring-white/8" style={{ pointerEvents: 'auto' }} />
              </motion.div>
              <div className="text-center space-y-1">
                <CardTitle className="text-xl font-black">
                  <span className="text-white/90">JTC </span>
                  <span className="bg-gradient-to-r from-[hsl(229,100%,65%)] to-[hsl(260,80%,65%)] bg-clip-text text-transparent">FluxPDV</span>
                </CardTitle>
                <CardDescription className="text-xs text-[#5a6480]">Acesse sua conta ou crie uma nova</CardDescription>
                <Button variant="ghost" size="sm" onClick={() => navigate("/sobre")} className="mt-0.5 gap-1 text-[#4a5478] hover:text-[hsl(229,100%,70%)] text-[11px] h-7 px-2">
                  <Info className="w-3 h-3" />
                  Sobre o Sistema
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 px-5 sm:px-6 pb-7">
            <Tabs defaultValue="login" className="w-full" onValueChange={() => { setRegisterStep(1); setAuthError(null); }}>
              <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-white/[0.03] rounded-xl h-12 border border-white/[0.04]">
                <TabsTrigger value="login" className="auth-tab font-bold text-sm rounded-lg transition-all duration-300">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="register" className="auth-tab font-bold text-sm rounded-lg transition-all duration-300">
                  Criar Conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-6">
                {showUnconfirmedEmailUI ? (
                  <motion.div 
                    className="space-y-5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${signupExpired ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                        <Mail className={`w-10 h-10 ${signupExpired ? "text-green-500" : "text-amber-500"}`} />
                      </div>
                      <h3 className={`font-semibold text-xl ${signupExpired ? "text-green-600" : "text-amber-600"}`}>
                        {signupExpired ? "Cadastro liberado!" : "E-mail não confirmado"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {signupExpired
                          ? "O prazo de verificação expirou. Agora você pode criar uma nova conta com este e-mail ou CPF."
                          : "Você ainda não confirmou seu e-mail:"}
                      </p>
                      {!signupExpired && (
                        <p className="font-bold text-primary text-base mt-1 break-all">{unconfirmedEmail}</p>
                      )}
                    </div>

                    {!signupExpired && (
                      <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 space-y-3">
                        <p className="text-sm text-amber-700 dark:text-amber-400 text-center">
                          ⚠️ Confirme seu e-mail para acessar a conta.
                        </p>
                        {countdown ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex flex-col items-center bg-amber-500/20 rounded-lg px-3 py-2 min-w-[52px]">
                              <span className="text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                                {String(countdown.hours).padStart(2, "0")}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium uppercase tracking-wide">horas</span>
                            </div>
                            <span className="text-amber-600 font-bold text-xl">:</span>
                            <div className="flex flex-col items-center bg-amber-500/20 rounded-lg px-3 py-2 min-w-[52px]">
                              <span className="text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                                {String(countdown.minutes).padStart(2, "0")}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium uppercase tracking-wide">min</span>
                            </div>
                            <span className="text-amber-600 font-bold text-xl">:</span>
                            <div className="flex flex-col items-center bg-amber-500/20 rounded-lg px-3 py-2 min-w-[52px]">
                              <span className="text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                                {String(countdown.seconds).padStart(2, "0")}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium uppercase tracking-wide">seg</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-500 text-center">Calculando tempo restante...</p>
                        )}
                        <p className="text-xs text-amber-600 dark:text-amber-500 text-center">
                          Após este tempo, e-mail e CPF ficam livres para novo cadastro.
                        </p>
                      </div>
                    )}

                    {signupExpired ? (
                      <Button
                        type="button"
                        className="w-full h-14 text-base font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        onClick={() => {
                          setShowUnconfirmedEmailUI(false);
                          setUnconfirmedEmail("");
                          setSignupExpired(false);
                          setCountdown(null);
                          const registerTab = document.querySelector('[data-value="register"]') as HTMLButtonElement;
                          registerTab?.click();
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Criar Nova Conta
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={() => {
                            const provider = getEmailProvider(unconfirmedEmail);
                            if (provider === "gmail") window.open("https://mail.google.com", "_blank");
                            else if (provider === "outlook") window.open("https://outlook.live.com", "_blank");
                          }}
                          className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-primary/80"
                        >
                          <ExternalLink className="mr-2 h-5 w-5" />
                          {getEmailProvider(unconfirmedEmail) === "gmail" ? "Abrir Gmail" : "Abrir Outlook"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleResendConfirmationEmail(unconfirmedEmail)}
                          className="w-full h-12"
                          disabled={isResendingConfirmation}
                        >
                          {isResendingConfirmation ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reenviando...</>
                          ) : (
                            "Reenviar e-mail de confirmação"
                          )}
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowUnconfirmedEmailUI(false);
                        setUnconfirmedEmail("");
                        setSignupExpired(false);
                        setCountdown(null);
                      }}
                      className="w-full h-12"
                    >
                      Voltar para o Login
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    onSubmit={handleLogin}
                    className="space-y-5"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    {/* Welcome text */}
                    <div className="text-center pb-3">
                      <motion.p 
                        className="text-xl font-bold text-[#e0e6ff]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        Bem-vindo de volta 👋
                      </motion.p>
                      <p className="text-sm text-[#5a6180] mt-1">Entre com suas credenciais</p>
                    </div>

                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <Label htmlFor="identifier" className="text-sm font-semibold text-[#a0aad4]">E-mail ou CPF</Label>
                      <Input
                        id="identifier"
                        name="identifier"
                        placeholder="seu@email.com ou 000.000.000-00"
                        required
                        disabled={isLoading}
                        className="h-14 text-base bg-white/[0.03] border-white/[0.06] focus:border-primary/40 focus:ring-2 focus:ring-primary/10 rounded-2xl pl-5 placeholder:text-[#3a4060] transition-all duration-300"
                      />
                    </motion.div>

                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Label htmlFor="password" className="text-sm font-semibold text-[#a0aad4]">Senha</Label>
                      <div className="relative group">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          disabled={isLoading}
                          className="h-14 text-base pr-14 bg-white/[0.03] border-white/[0.06] focus:border-primary/40 focus:ring-2 focus:ring-primary/10 rounded-2xl pl-5 placeholder:text-[#3a4060] transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6180] hover:text-primary transition-colors duration-200 p-1"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </motion.div>

                    {/* Errors shown via modal */}

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button
                        type="submit"
                        className="auth-btn-primary w-full h-14 text-base font-bold bg-gradient-to-r from-primary via-[hsl(229,100%,62%)] to-primary/90 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 rounded-2xl relative overflow-hidden group"
                        disabled={isLoading}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        {isLoading ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Entrando...</>
                        ) : (
                          "Entrar na Conta"
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                )}

                <motion.div 
                  className="lg:hidden pt-6 border-t border-white/5 mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center justify-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 backdrop-blur-sm">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}>
                      <Gift className="w-6 h-6 text-accent" />
                    </motion.div>
                    <span className="text-sm text-muted-foreground">Convide amigos e ganhe <strong className="text-accent font-bold">1 mês grátis</strong>!</span>
                  </div>
                </motion.div>
              </TabsContent>

              {/* REGISTER TAB */}
              <TabsContent value="register" className="space-y-5">
                <div className="flex justify-center items-center gap-1 mb-8 py-3 px-2">
                  <StepIndicator step={1} label="Dados" icon={User} />
                  <div className="flex-1 h-0.5 rounded-full max-w-5 overflow-hidden bg-white/[0.04]">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" initial={false} animate={{ scaleX: registerStep > 1 ? 1 : 0 }} transition={{ duration: 0.4, ease: "easeOut" }} style={{ transformOrigin: "left" }} />
                  </div>
                  <StepIndicator step={2} label="Contato" icon={Mail} />
                  <div className="flex-1 h-0.5 rounded-full max-w-5 overflow-hidden bg-white/[0.04]">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" initial={false} animate={{ scaleX: registerStep > 2 ? 1 : 0 }} transition={{ duration: 0.4, ease: "easeOut" }} style={{ transformOrigin: "left" }} />
                  </div>
                  <StepIndicator step={3} label="Endereço" icon={MapPin} />
                  <div className="flex-1 h-0.5 rounded-full max-w-5 overflow-hidden bg-white/[0.04]">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" initial={false} animate={{ scaleX: registerStep > 3 ? 1 : 0 }} transition={{ duration: 0.4, ease: "easeOut" }} style={{ transformOrigin: "left" }} />
                  </div>
                  <StepIndicator step={4} label="Código" icon={Ticket} />
                  <div className="flex-1 h-0.5 rounded-full max-w-5 overflow-hidden bg-white/[0.04]">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" initial={false} animate={{ scaleX: registerStep > 4 ? 1 : 0 }} transition={{ duration: 0.4, ease: "easeOut" }} style={{ transformOrigin: "left" }} />
                  </div>
                  <StepIndicator step={5} label="Captcha" icon={Shield} />
                  <div className="flex-1 h-0.5 rounded-full max-w-5 overflow-hidden bg-white/[0.04]">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" initial={false} animate={{ scaleX: registerStep > 5 ? 1 : 0 }} transition={{ duration: 0.4, ease: "easeOut" }} style={{ transformOrigin: "left" }} />
                  </div>
                  <StepIndicator step={6} label="Fim" icon={Sparkles} />
                </div>

                {/* Step 1 */}
                {registerStep === 1 && (
                  <motion.div 
                    className="space-y-5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    key="step-1"
                  >
                    <div className="text-center mb-5">
                      <h3 className="font-bold text-xl text-[#e0e6ff]">Dados Pessoais</h3>
                      <p className="text-sm text-[#5a6180] mt-1">Informe seu nome e documento</p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-1 gap-1 text-[#4a5478] hover:text-[hsl(229,100%,70%)] text-[11px] h-7 px-2">
                            <HelpCircle className="w-3 h-3" />
                            Como criar conta?
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-lg font-bold">
                              {docType === "cpf" ? "📋 Como criar conta com CPF" : "🏢 Como criar conta com CNPJ"}
                            </DialogTitle>
                          </DialogHeader>
                          {docType === "cpf" ? (
                            <div className="space-y-4 text-sm">
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 1 — Dados Pessoais</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Digite seu <strong>nome completo</strong></li>
                                  <li>Selecione <strong>CPF</strong> como tipo de cadastro</li>
                                  <li>Digite seu CPF (o sistema verifica automaticamente se está disponível)</li>
                                  <li>Selecione seu <strong>sexo</strong> (Masculino ou Feminino)</li>
                                  <li>Clique em <strong>Próximo</strong></li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 2 — Contato & Senha</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Digite seu <strong>e-mail</strong> (apenas Gmail ou Outlook)</li>
                                  <li>Digite seu <strong>telefone</strong> com DDD</li>
                                  <li>Crie uma <strong>senha</strong> com no mínimo 6 caracteres</li>
                                  <li>Confirme a senha</li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 3 — Endereço</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Digite o <strong>CEP</strong> (preenche cidade/estado automaticamente)</li>
                                  <li>Complete rua, número e bairro</li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 4 — Código de Convite</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Se tiver um código, digite-o para ganhar benefícios</li>
                                  <li>Caso não tenha, selecione <strong>"Não tenho"</strong></li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 5 — Verificação</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Resolva o <strong>CAPTCHA</strong> para confirmar que você é humano</li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 6 — Finalização</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Confirme seu e-mail clicando no link enviado</li>
                                  <li>Pronto! Sua conta está criada 🎉</li>
                                </ol>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 text-sm">
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 1 — Dados da Empresa</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Selecione <strong>CNPJ</strong> como tipo de cadastro</li>
                                  <li>Digite o CNPJ da empresa (14 dígitos)</li>
                                  <li>O sistema busca automaticamente o <strong>nome fantasia</strong> da empresa via consulta pública</li>
                                  <li>Caso queira, ajuste o nome manualmente</li>
                                  <li>Clique em <strong>Próximo</strong></li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 2 — Contato & Senha</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Digite o <strong>e-mail da empresa</strong> (apenas Gmail ou Outlook)</li>
                                  <li>Digite o <strong>telefone</strong> com DDD</li>
                                  <li>Crie uma <strong>senha</strong> com no mínimo 6 caracteres</li>
                                  <li>Confirme a senha</li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 3 — Endereço</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Digite o <strong>CEP</strong> do estabelecimento</li>
                                  <li>Complete rua, número e bairro</li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 4 — Código de Convite</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Se tiver um código, digite-o para ganhar benefícios</li>
                                  <li>Caso não tenha, selecione <strong>"Não tenho"</strong></li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 5 — Verificação</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Resolva o <strong>CAPTCHA</strong> para confirmar</li>
                                </ol>
                              </div>
                              <div className="space-y-2">
                                <p className="font-bold text-primary">Etapa 6 — Finalização</p>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                  <li>Confirme o e-mail clicando no link enviado</li>
                                  <li>Pronto! Sua empresa está cadastrada 🎉</li>
                                </ol>
                              </div>
                              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                <p className="text-xs text-primary font-medium">💡 Dica: Ao digitar o CNPJ, o nome da empresa é preenchido automaticamente pela consulta à base pública da Receita Federal.</p>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="fullName" className="text-sm font-semibold text-foreground/90">
                        {docType === "cnpj" ? "Nome Fantasia da Empresa" : "Nome Completo"}
                      </Label>
                      <Input
                        id="fullName"
                        placeholder={docType === "cnpj" ? "Digite o nome fantasia da empresa" : "Digite seu nome completo"}
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                        disabled={isLoading}
                        className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground/90">Tipo de Cadastro</Label>
                      <RadioGroup
                        value={docType}
                        onValueChange={(val: "cpf" | "cnpj") => {
                          setDocType(val);
                          setFormData({ ...formData, cpf: "" });
                          setCpfError(null);
                          setCpfAvailable(null);
                        }}
                        className="flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="cpf" id="doc-cpf" />
                          <Label htmlFor="doc-cpf" className="text-sm font-medium cursor-pointer">CPF</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="cnpj" id="doc-cnpj" />
                          <Label htmlFor="doc-cnpj" className="text-sm font-medium cursor-pointer">CNPJ</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="cpf" className="text-sm font-semibold text-foreground/90">{docType === "cpf" ? "CPF" : "CNPJ"}</Label>
                      <Input
                        id="cpf"
                        placeholder={docType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                        value={formData.cpf}
                        onChange={(e) => {
                          const formatted = formatDocInput(e.target.value);
                          setFormData({ ...formData, cpf: formatted });
                          const clean = formatted.replace(/\D/g, "");
                          const expectedLen = docType === "cpf" ? 11 : 14;
                          setCpfAvailable(null);
                          if (clean.length === expectedLen) {
                            const isValid = docType === "cpf" ? isValidCPF(clean) : isValidCNPJ(clean);
                            if (!isValid) {
                              setCpfError(`${docType.toUpperCase()} inválido`);
                            } else {
                              setCpfError(null);
                              if (cpfCheckTimeout.current) clearTimeout(cpfCheckTimeout.current);
                              cpfCheckTimeout.current = setTimeout(() => checkCpfAvailability(clean), 500);
                              // Auto-fill company name for CNPJ
                              if (docType === "cnpj") {
                                fetchCNPJData(clean);
                              }
                            }
                          } else {
                            setCpfError(null);
                          }
                        }}
                        required
                        disabled={isLoading}
                        inputMode="numeric"
                        maxLength={docType === "cpf" ? 14 : 18}
                        className={`h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300 ${cpfError ? "border-destructive ring-destructive/20" : cpfAvailable === true ? "border-accent ring-accent/20" : ""}`}
                      />
                      {isCheckingCpf && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Verificando disponibilidade...</p>
                        </div>
                      )}
                      {cpfError && <p className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="h-3 w-3" />{cpfError}</p>}
                      {!cpfError && cpfAvailable === true && !isCheckingCpf && (
                        <p className="text-xs text-accent font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{docType.toUpperCase()} disponível</p>
                      )}
                    </div>

                    {isFetchingCNPJ && docType === "cnpj" && (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Buscando dados do CNPJ...</p>
                      </div>
                    )}

                    {docType === "cpf" && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-foreground/90">Sexo</Label>
                        <RadioGroup
                          value={gender}
                          onValueChange={(val: "masculino" | "feminino") => setGender(val)}
                          className="flex gap-6"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="masculino" id="gender-m" />
                            <Label htmlFor="gender-m" className="text-sm font-medium cursor-pointer">Masculino</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="feminino" id="gender-f" />
                            <Label htmlFor="gender-f" className="text-sm font-medium cursor-pointer">Feminino</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className="w-full h-14 text-base font-bold mt-6 bg-gradient-to-r from-primary via-[hsl(229,100%,62%)] to-primary/90 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 rounded-2xl relative overflow-hidden group"
                      disabled={isLoading}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      Próximo
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 2 - Contato & Senha */}
                {registerStep === 2 && (
                  <motion.div 
                    className="space-y-5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    key="step-2"
                  >
                    <div className="text-center mb-5">
                      <h3 className="font-bold text-xl text-[#e0e6ff]">Contato & Senha</h3>
                      <p className="text-sm text-[#5a6180] mt-1">Informe e-mail, telefone e crie sua senha</p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-sm font-semibold text-foreground/90">E-mail</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData({ ...formData, email: val });
                            setEmailAvailable(null);
                            setEmailError(null);
                            if (isValidEmailProvider(val)) {
                              if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
                              emailCheckTimeout.current = setTimeout(() => checkEmailAvailability(val), 600);
                            }
                          }}
                          required
                          disabled={isLoading}
                          className={`h-12 bg-muted/30 border-border/40 focus:ring-2 rounded-xl transition-all duration-300 pr-28 ${
                            getEmailProvider(formData.email) === "gmail"
                              ? "focus:border-red-400 focus:ring-red-400/20 border-red-400/50"
                              : getEmailProvider(formData.email) === "outlook"
                              ? "focus:border-blue-400 focus:ring-blue-400/20 border-blue-400/50"
                              : (() => { const d = formData.email.split("@")[1] || ""; return formData.email.includes("@") && d.includes("."); })() && getEmailProvider(formData.email) === "unknown"
                              ? "focus:border-destructive focus:ring-destructive/20 border-destructive/50"
                              : "focus:border-primary focus:ring-primary/20"
                          }`}
                        />
                        {(() => {
                          const provider = getEmailProvider(formData.email);
                          const domain = formData.email.split("@")[1] || "";
                          const hasDot = formData.email.includes("@") && domain.includes(".");
                          return (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {provider === "gmail" && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-400/30 text-red-500 text-xs font-bold">
                                  <span className="text-base leading-none">G</span> Gmail
                                </span>
                              )}
                              {provider === "outlook" && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-400/30 text-blue-500 text-xs font-bold">
                                  <span className="text-base leading-none">⊞</span> Outlook
                                </span>
                              )}
                              {provider === "unknown" && hasDot && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold">
                                  ✕ Inválido
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {(() => {
                        const provider = getEmailProvider(formData.email);
                        const domain = formData.email.split("@")[1] || "";
                        const hasDot = formData.email.includes("@") && domain.includes(".");
                        if (provider === "unknown" && hasDot) {
                          return <p className="text-xs text-destructive font-medium">Apenas @gmail.com ou @outlook.com são aceitos</p>;
                        }
                        if (isCheckingEmail) {
                          return <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Verificando e-mail...</p>;
                        }
                        if (emailError) {
                          return <p className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="h-3 w-3" />{emailError}</p>;
                        }
                        if (emailAvailable === true) {
                          return <p className="text-xs text-accent font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />E-mail disponível</p>;
                        }
                        return <p className="text-xs text-muted-foreground">Apenas @gmail.com ou @outlook.com</p>;
                      })()}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="phone" className="text-sm font-semibold text-foreground/90">Telefone</Label>
                      <Input
                        id="phone"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setFormData({ ...formData, phone: formatted });
                          const clean = formatted.replace(/\D/g, "");
                          setPhoneAvailable(null);
                          if (clean.length > 0 && clean.length < 11) {
                            setPhoneError("Telefone deve ter 11 dígitos");
                          } else if (clean.length === 11) {
                            setPhoneError(null);
                            if (phoneCheckTimeout.current) clearTimeout(phoneCheckTimeout.current);
                            phoneCheckTimeout.current = setTimeout(() => checkPhoneAvailability(clean), 500);
                          } else {
                            setPhoneError(null);
                          }
                        }}
                        required
                        disabled={isLoading}
                        inputMode="numeric"
                        maxLength={15}
                        className={`h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300 ${phoneError ? "border-destructive ring-destructive/20" : phoneAvailable === true ? "border-accent ring-accent/20" : ""}`}
                      />
                      {isCheckingPhone && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Verificando disponibilidade...</p>
                        </div>
                      )}
                      {phoneError && <p className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="h-3 w-3" />{phoneError}</p>}
                      {!phoneError && phoneAvailable === true && !isCheckingPhone && (
                        <p className="text-xs text-accent font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Telefone disponível</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="password" className="text-sm font-semibold text-foreground/90">Senha</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 6 caracteres"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            disabled={isLoading}
                            className="h-12 pr-11 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-200"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground/90">Confirmar</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Repita a senha"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                            disabled={isLoading}
                            className={`h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300 ${formData.confirmPassword.length > 0 ? (formData.password === formData.confirmPassword ? "border-green-500 ring-green-500/20" : "border-destructive ring-destructive/20") : ""}`}
                          />
                        </div>
                      </div>
                    </div>

                    {formData.confirmPassword.length > 0 && (
                      <div className={`flex items-center gap-2 text-xs font-medium ${formData.password === formData.confirmPassword ? "text-green-600" : "text-destructive"}`}>
                        {formData.password === formData.confirmPassword ? (
                          <><CheckCircle2 className="h-4 w-4" /><span>As senhas coincidem</span></>
                        ) : (
                          <><XCircle className="h-4 w-4" /><span>As senhas não coincidem</span></>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      <Button type="button" variant="outline" onClick={handlePreviousStep} className="flex-1 h-14 rounded-xl border-border/50 hover:bg-muted/50" disabled={isLoading}>
                        <ChevronLeft className="mr-2 h-5 w-5" />Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNextStep}
                        className="flex-1 h-14 rounded-full bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                        disabled={isLoading}
                      >
                        Próximo<ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3 - Endereço */}
                {registerStep === 3 && (
                  <motion.div 
                    className="space-y-5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    key="step-2"
                  >
                    <div className="text-center mb-5">
                      <h3 className="font-bold text-xl text-[#e0e6ff]">Endereço</h3>
                      <p className="text-sm text-[#5a6180] mt-1">Digite o CEP para preenchimento automático</p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="cep" className="text-sm font-semibold text-foreground/90">CEP</Label>
                      <div className="relative">
                        <Input
                          id="cep"
                          placeholder="00000-000"
                          value={formData.cep}
                          onChange={(e) => {
                            const formatted = formatCEPInput(e.target.value);
                            setFormData({ ...formData, cep: formatted });
                            handleCEPChange(formatted);
                          }}
                          maxLength={9}
                          required
                          disabled={isLoading || isFetchingCEP}
                          inputMode="numeric"
                          className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                        />
                        {isFetchingCEP && (
                          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="street" className="text-sm font-semibold text-foreground/90">Rua</Label>
                      <Input
                        id="street"
                        placeholder="Nome da rua"
                        value={addressData.street}
                        onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                        required
                        disabled={isLoading}
                        className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="number" className="text-sm font-semibold text-foreground/90">Número</Label>
                        <Input
                          id="number"
                          placeholder="Nº"
                          value={formData.number}
                          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                          required
                          disabled={isLoading}
                          className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="neighborhood" className="text-sm font-semibold text-foreground/90">Bairro</Label>
                        <Input
                          id="neighborhood"
                          placeholder="Seu bairro"
                          value={addressData.neighborhood}
                          onChange={(e) => setAddressData({ ...addressData, neighborhood: e.target.value })}
                          required
                          disabled={isLoading}
                          className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-foreground/90">Estado</Label>
                        <Select value={selectedEstado} onValueChange={setSelectedEstado} disabled={isLoading}>
                          <SelectTrigger className="h-12 bg-muted/30 border-border/40 rounded-xl">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50 rounded-xl">
                            {estados.map((estado) => (
                              <SelectItem key={estado.id} value={estado.sigla}>
                                {estado.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-foreground/90">Cidade</Label>
                        <Select value={selectedCidade} onValueChange={setSelectedCidade} disabled={isLoading || !selectedEstado}>
                          <SelectTrigger className="h-12 bg-muted/30 border-border/40 rounded-xl">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50 max-h-[300px] rounded-xl">
                            {cidades.map((cidade) => (
                              <SelectItem key={cidade.id} value={cidade.nome}>
                                {cidade.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Errors shown via modal */}

                    <div className="flex gap-3 mt-6">
                      <Button type="button" variant="outline" onClick={handlePreviousStep} className="flex-1 h-14 rounded-xl border-border/50 hover:bg-muted/50" disabled={isLoading}>
                        <ChevronLeft className="mr-2 h-5 w-5" />Voltar
                      </Button>
                      <Button type="button" onClick={handleNextStep} className="flex-1 h-14 rounded-full bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300" disabled={isLoading}>
                        Próximo<ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4 - Tipo de Negócio */}
                {registerStep === 4 && (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    key="step-4-business"
                  >
                    <div className="text-center mb-5">
                      <h3 className="font-bold text-xl text-[#e0e6ff]">Tipo do Negócio</h3>
                      <p className="text-sm text-[#5a6180] mt-1">Escolha o tipo de negócio da sua loja</p>
                      <p className="text-xs text-[#4a5478] mt-2">⚠️ Esta escolha não poderá ser alterada depois</p>
                    </div>

                    <div className="space-y-3">
                      {[
                        { value: "comercio" as const, icon: ShoppingCart, label: "Comércio", desc: "Mercados, mercearias, conveniências, lojas gerais" },
                        { value: "loja_roupas" as const, icon: Package, label: "Loja de Roupas", desc: "Vestuário com variações de tamanho e cor" },
                        { value: "delivery" as const, icon: Truck, label: "Delivery", desc: "Restaurantes, lanchonetes, delivery com pedidos online" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setBusinessType(opt.value)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                            businessType === opt.value
                              ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                              : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            businessType === opt.value
                              ? "bg-gradient-to-br from-primary to-primary/70 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            <opt.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <p className={`font-bold text-sm ${businessType === opt.value ? "text-primary" : "text-foreground/90"}`}>{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                          </div>
                          {businessType === opt.value && (
                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button type="button" variant="outline" onClick={handlePreviousStep} className="flex-1 h-14 rounded-xl border-border/50 hover:bg-muted/50" disabled={isLoading}>
                        <ChevronLeft className="mr-2 h-5 w-5" />Voltar
                      </Button>
                      <Button type="button" onClick={handleNextStep} className="flex-1 h-14 rounded-full bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300" disabled={isLoading}>
                        Próximo<ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 5 - Código de Convite */}
                {registerStep === 5 && (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    key="step-4"
                  >
                    <div className="text-center mb-5">
                      <h3 className="font-bold text-xl text-[#e0e6ff]">Código de Convite</h3>
                      <p className="text-sm text-[#5a6180] mt-1">Você tem um código de convite de um amigo?</p>
                    </div>

                    {hasInviteCode === null ? (
                      <div className="space-y-5">
                        <div className="flex gap-4">
                          <Button type="button" variant="outline" className="flex-1 h-16 border-2 border-accent/50 text-accent hover:bg-accent/10 hover:border-accent font-bold text-base rounded-xl transition-all duration-300" onClick={() => setHasInviteCode(true)}>
                            <Gift className="mr-2 h-6 w-6" />Sim, tenho!
                          </Button>
                          <Button type="button" variant="outline" className="flex-1 h-16 border-border/50 hover:bg-muted/50 font-medium text-base rounded-xl" onClick={() => setHasInviteCode(false)}>
                            Não tenho
                          </Button>
                        </div>
                      </div>
                    ) : hasInviteCode ? (
                      <div className="space-y-5">
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-foreground/90">Digite o código</Label>
                          <div className="relative">
                            <Input
                              value={inviteCode}
                              onChange={(e) => handleInviteCodeChange(e.target.value)}
                              placeholder="Ex: ABC123"
                              maxLength={8}
                              className="h-16 uppercase font-mono text-2xl tracking-[0.3em] text-center bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                              disabled={isLoading}
                              autoCapitalize="characters"
                              style={{ textTransform: 'uppercase' }}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              {isValidatingCode && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                              {!isValidatingCode && codeValidationStatus === "valid" && <CheckCircle2 className="h-7 w-7 text-accent" />}
                              {!isValidatingCode && (codeValidationStatus === "invalid" || codeValidationStatus === "used") && <XCircle className="h-7 w-7 text-destructive" />}
                            </div>
                          </div>
                          {codeValidationStatus === "valid" && (
                            <div className="bg-gradient-to-r from-accent/15 to-accent/5 p-4 rounded-xl border border-accent/30 text-center">
                              <p className="text-sm text-accent font-bold">🎉 Código válido! Você ganhará 1 mês + 3 dias grátis!</p>
                            </div>
                          )}
                          {codeValidationStatus === "invalid" && (
                            <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/30 text-center">
                              <p className="text-sm text-destructive font-medium">Código inválido. Verifique e tente novamente.</p>
                            </div>
                          )}
                          {codeValidationStatus === "used" && (
                            <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/30 text-center">
                              <p className="text-sm text-destructive font-medium">Este código já foi utilizado.</p>
                            </div>
                          )}
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-full" onClick={() => { setHasInviteCode(false); setInviteCode(""); setCodeValidationStatus("idle"); }}>
                          Na verdade, não tenho código
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-muted/20 rounded-2xl p-6 border border-border/30 text-center">
                        <p className="text-muted-foreground">
                          Sem código? Sem problema! Você ainda ganha <strong className="text-foreground">3 dias grátis</strong>.
                        </p>
                        <Button type="button" variant="ghost" size="sm" className="mt-4 text-accent hover:text-accent hover:bg-accent/10 font-medium" onClick={() => setHasInviteCode(true)}>
                          Na verdade, tenho um código!
                        </Button>
                      </div>
                    )}

                    {/* Errors shown via modal */}

                    <div className="flex gap-3 mt-8">
                      <Button type="button" variant="outline" onClick={handlePreviousStep} className="flex-1 h-14 rounded-xl border-border/50 hover:bg-muted/50" disabled={isLoading}>
                        <ChevronLeft className="mr-2 h-5 w-5" />Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNextStep}
                        className="flex-1 h-14 rounded-full bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                        disabled={isLoading || hasInviteCode === null || (hasInviteCode && codeValidationStatus !== "valid" && inviteCode.length > 0)}
                      >
                        Próximo<ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground pt-2">
                      {hasInviteCode && codeValidationStatus === "valid"
                        ? "Você ganhará 1 mês + 3 dias de teste grátis! 🎉"
                        : "Você ganhará 3 dias de teste grátis"}
                    </p>
                  </motion.div>
                )}

                {/* Step 5 - CAPTCHA */}
                {registerStep === 6 && (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    key="step-5"
                  >
                    <div className="text-center mb-4">
                      <h3 className="font-bold text-xl text-[#e0e6ff]">Verificação de Segurança</h3>
                      <p className="text-sm text-[#5a6180] mt-1">Complete o desafio para continuar</p>
                    </div>

                    <JTCCaptcha onVerified={setCaptchaVerified} />

                    <div className="flex gap-3 mt-6">
                      <Button type="button" variant="outline" onClick={handlePreviousStep} className="flex-1 h-14 rounded-xl border-border/50 hover:bg-muted/50" disabled={isLoading}>
                        <ChevronLeft className="mr-2 h-5 w-5" />Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleGoToEmailVerification}
                        className="flex-1 h-14 rounded-full bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                        disabled={isLoading || !captchaVerified}
                      >
                        {isLoading ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Criando...</>
                        ) : (
                          <>Criar Conta<ChevronRight className="ml-2 h-5 w-5" /></>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 6 - Email Verification */}
                {registerStep === 7 && (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    key="step-6"
                  >
                    <div className="text-center mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/10">
                        <Mail className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="font-bold text-2xl text-foreground">
                        Confirme seu E-mail
                      </h3>
                      <p className="text-sm text-muted-foreground mt-3">Enviamos um link de confirmação para:</p>
                      <p className="font-bold text-primary text-lg mt-2 break-all bg-primary/5 py-2 px-4 rounded-lg inline-block">
                        {formData.email}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-destructive/15 to-destructive/5 rounded-xl p-5 border border-destructive/30">
                      <p className="text-sm text-destructive text-center font-bold">
                        ⚠️ Sua conta só será ativada após confirmar o e-mail!
                      </p>
                      <p className="text-xs text-destructive/80 text-center mt-2">
                        Sem a confirmação, você não conseguirá fazer login.
                      </p>
                    </div>

                    <div className="bg-muted/20 rounded-xl p-4 border border-border/30 text-center">
                      <p className="text-sm text-muted-foreground">
                        Verifique também a pasta de <strong>spam</strong>. Só aceitamos <span className="text-primary font-semibold">@gmail.com</span> ou <span className="text-primary font-semibold">@outlook.com</span>
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={openEmailApp}
                      className="w-full h-16 text-lg font-bold bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary shadow-xl hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 rounded-xl"
                    >
                      <ExternalLink className="mr-3 h-6 w-6" />
                      {getEmailProvider(formData.email) === "gmail" ? "Abrir Gmail" : "Abrir Outlook"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (session?.user?.email_confirmed_at) {
                            toast({ title: "E-mail confirmado!", description: "Redirecionando para o dashboard..." });
                            navigate("/dashboard");
                            return;
                          }
                          // Tenta fazer login para verificar se já confirmou
                          const { data, error } = await supabase.auth.signInWithPassword({
                            email: formData.email,
                            password: formData.password,
                          });
                          if (!error && data?.user?.email_confirmed_at) {
                            toast({ title: "E-mail confirmado!", description: "Redirecionando para o dashboard..." });
                            navigate("/dashboard");
                          } else {
                            if (!error && data?.session) await supabase.auth.signOut();
                            toast({ variant: "destructive", title: "E-mail ainda não confirmado", description: "Clique no link que enviamos para seu e-mail antes de continuar." });
                          }
                        } catch {
                          toast({ variant: "destructive", title: "E-mail ainda não confirmado", description: "Clique no link que enviamos para seu e-mail." });
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="w-full h-14 rounded-xl border-primary/50 text-primary hover:bg-primary/10 font-bold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verificando...</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-5 w-5" />Já confirmei meu e-mail</>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResendConfirmationEmail()}
                      className="w-full h-14 rounded-xl border-border/50 hover:bg-muted/50"
                      disabled={isResendingConfirmation}
                    >
                      {isResendingConfirmation ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Reenviando...</>
                      ) : (
                        "Reenviar e-mail de confirmação"
                      )}
                    </Button>

                    <Button type="button" variant="ghost" onClick={resetForm} className="w-full h-12 text-muted-foreground hover:text-foreground">
                      Voltar para o Login
                    </Button>

                    <p className="text-sm text-center text-muted-foreground pt-2">
                      {hasInviteCode && codeValidationStatus === "valid"
                        ? "🎉 Após confirmar, você terá 1 mês + 3 dias grátis!"
                        : "Após confirmar, você terá 3 dias de teste grátis!"}
                    </p>
                  </motion.div>
                )}

                {/* Manual */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full h-12 text-muted-foreground hover:text-foreground hover:bg-muted/30 mt-6 rounded-xl" type="button">
                      <HelpCircle className="mr-2 h-5 w-5" />
                      Manual: Como Criar Minha Conta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-2xl">
                    <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground rounded-t-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl text-primary-foreground">
                          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <HelpCircle className="h-5 w-5" />
                          </div>
                          Como Criar Sua Conta
                        </DialogTitle>
                      </DialogHeader>
                      <p className="text-primary-foreground/80 text-sm mt-2">
                        Siga as <strong>4 etapas</strong> abaixo para criar sua conta rapidamente.
                      </p>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="relative pl-10 pb-4 border-l-2 border-primary/20 ml-3">
                        <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">1</div>
                        <h3 className="font-semibold text-foreground text-sm mb-2">Dados Pessoais & Senha</h3>
                        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                          <p>• <strong>Nome Completo:</strong> Seu nome e sobrenome</p>
                          <p>• <strong>CPF:</strong> Será validado automaticamente (formato: 000.000.000-00)</p>
                          <p>• <strong>E-mail:</strong> Aceitamos apenas <strong className="text-primary">@gmail.com</strong> ou <strong className="text-primary">@outlook.com</strong></p>
                          <p>• <strong>Telefone:</strong> 11 dígitos com DDD (formato: (00) 00000-0000)</p>
                          <p>• <strong>Senha:</strong> Mínimo 6 caracteres — a confirmação valida em tempo real ✅</p>
                        </div>
                      </div>
                      <div className="relative pl-10 pb-4 border-l-2 border-primary/20 ml-3">
                        <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">2</div>
                        <h3 className="font-semibold text-foreground text-sm mb-2">Endereço</h3>
                        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                          <p>• <strong>CEP:</strong> Digite e o endereço preenche automaticamente</p>
                          <p>• <strong>Número:</strong> Informe o número da residência</p>
                          <p>• Se o CEP não encontrar, selecione estado e cidade manualmente</p>
                        </div>
                      </div>
                      <div className="relative pl-10 pb-4 border-l-2 border-primary/20 ml-3">
                        <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">3</div>
                        <h3 className="font-semibold text-foreground text-sm mb-2">Código de Convite</h3>
                        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                          <p className="flex items-center gap-1.5">
                            <Gift className="h-3.5 w-3.5 text-accent shrink-0" />
                            <strong>Com código:</strong> <span className="text-accent font-semibold">1 mês + 3 dias grátis!</span>
                          </p>
                          <p>• <strong>Sem código:</strong> 3 dias de teste grátis</p>
                          <p>• O código é validado automaticamente ao digitar</p>
                        </div>
                      </div>
                      <div className="relative pl-10 ml-3">
                        <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shadow-md">4</div>
                        <h3 className="font-semibold text-foreground text-sm mb-2">Verificação de E-mail</h3>
                        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                          <p>• Um link de confirmação será enviado ao seu e-mail</p>
                          <p>• Clique no link para ativar sua conta</p>
                          <p>• Use os botões rápidos para abrir <strong>Gmail</strong> ou <strong>Outlook</strong></p>
                          <p>• Verifique também a pasta de <strong>spam/lixo eletrônico</strong></p>
                        </div>
                      </div>
                      <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Pronto!</strong> Após confirmar o e-mail, faça login e comece a usar o JTC FluxPDV. Seu período gratuito começa imediatamente.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      {/* Modal de erro */}
      <AlertDialog open={!!authError} onOpenChange={(open) => { if (!open) setAuthError(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <AlertDialogTitle className="text-center text-lg">
                Ops! Algo deu errado
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center text-base leading-relaxed">
              {authError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <AlertDialogAction
              onClick={() => setAuthError(null)}
              className="w-full bg-primary hover:bg-primary/90 rounded-xl h-12 text-base font-semibold"
            >
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog conta bloqueada */}
      <AlertDialog open={showBlockedAccountDialog} onOpenChange={setShowBlockedAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Conta Bloqueada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta conta foi bloqueada. Se você acredita que isso foi um erro ou deseja solicitar a reativação, entre em contato conosco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivateAccount} className="bg-accent hover:bg-accent/90">
              Solicitar Reativação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Auth;
