import { BlurTargetView } from "expo-blur";
import { GlassTargetContext } from "../context/GlassTargetContext";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Modal from "./ui/AppModal";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";
import { authMaterial as p, MIN_TOUCH, radius, space, type } from "../theme";
import Button from "./ui/Button";
import Gradient from "./ui/Gradient";
import KeyboardAvoider from "./ui/KeyboardAvoider";
import SocialSignIn from "./auth/SocialSignIn";
import { NeumorphicInput, PrivacyCheckbox, RelationshipDropdown, SignupProgressIndicator } from "./auth/AuthControls";
import AuthBackButton from "./ui/AuthBackButton";
import { useToast } from "./ui/Toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Auth({ onLoginSuccess, onProfessional, onBack, initialScene = "login" }) {
    const { colors } = useTheme();
    const { width, height, fontScale } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const toast = useToast(), submitting = useRef(false), scroll = useRef(null);
    const [scene, setScene] = useState(initialScene);
    const [registerStep, setRegisterStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingProvider, setLoadingProvider] = useState("");
    const [errors, setErrors] = useState({});
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [surname, setSurname] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPass, setRegPass] = useState("");
    const [regConfirm, setRegConfirm] = useState("");
    const [relationship, setRelationship] = useState("");
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [termsOpen, setTermsOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotSent, setForgotSent] = useState(false);
    const [socialPending, setSocialPending] = useState(null);
    useEffect(() => { Keyboard.dismiss(); scroll.current?.scrollTo({ y: 0, animated: false }); }, [scene, registerStep]);
    const setErr = (key, value) => setErrors(current => ({ ...current, [key]: value }));
    const showSocialError = useCallback(error => toast.error(error?.message || "Social sign-in failed"), [toast]);
    const finishAuth = useCallback(({ user, token }) => onLoginSuccess(user, token), [onLoginSuccess]);
    const begin = () => { if (submitting.current) return false; submitting.current = true; setLoading(true); return true; };
    const end = () => { submitting.current = false; setLoading(false); };

    const handleSocialCredential = useCallback(async (provider, credential) => {
        if (submitting.current) return;
        submitting.current = true;
        setLoadingProvider(provider);
        try {
            const result = await api.socialAuth({ provider, credential });
            if (result.status === "authenticated") return await finishAuth(result);
            setSocialPending({ token: result.socialToken, profile: result.profile });
            setErrors({});
            if (result.status === "link_required") { setPassword(""); setScene("link"); return; }
            // Provider display names do not identify compound given-name/surname boundaries.
            setFirstName(""); setSurname("");
            setTermsAgreed(false); setRelationship("");
            setRegEmail(result.profile.email || "");
            setRegPass(""); setRegConfirm("");
            setRegisterStep(1); setScene("register");
        } catch (error) { showSocialError(error); }
        finally { submitting.current = false; setLoadingProvider(""); }
    }, [finishAuth, showSocialError]);

    const handleLogin = async () => {
        const next = {};
        if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address";
        if (!password) next.password = "Password is required";
        setErrors(next);
        if (Object.keys(next).length || !begin()) return;
        try { await finishAuth(await api.login({ email: email.trim(), password })); }
        catch (error) { toast.error(error.message || "Login failed"); }
        finally { end(); }
    };
    const credentialErrors = () => {
        const next = {};
        if (!firstName.trim()) next.firstName = "First name is required";
        if (!surname.trim()) next.surname = "Surname is required";
        if (!EMAIL_RE.test(regEmail.trim())) next.regEmail = "Enter a valid email address";
        if (regPass.length < 8) next.regPass = "Use at least 8 characters";
        if (regConfirm !== regPass) next.regConfirm = "Passwords don't match";
        return next;
    };
    const validateCredentials = () => {
        const next = credentialErrors(); setErrors(next);
        if (!Object.keys(next).length) setRegisterStep(2);
    };
    const handleRegister = async () => {
        const next = credentialErrors();
        if (Object.keys(next).length) { setErrors(next); setRegisterStep(1); return; }
        if (!relationship) next.relationship = "Choose your role";
        if (!termsAgreed) next.terms = "Please accept the privacy agreement";
        setErrors(next);
        if (Object.keys(next).length || !begin()) return;
        const body = { fullName: `${firstName.trim()} ${surname.trim()}`, password: regPass, relationship, consentAccepted: true };
        try {
            const result = socialPending
                ? await api.socialRegister({ ...body, socialToken: socialPending.token })
                : await api.register({ ...body, email: regEmail.trim() });
            await finishAuth(result);
        } catch (error) { toast.error(error.message || "Registration failed"); }
        finally { end(); }
    };
    const handleLink = async () => {
        if (!password) return setErr("password", "Password is required");
        if (!begin()) return;
        try { await finishAuth(await api.socialLink({ socialToken: socialPending.token, password })); }
        catch (error) { toast.error(error.message || "Could not link this account"); }
        finally { end(); }
    };
    const handleForgot = async () => {
        if (!EMAIL_RE.test(forgotEmail.trim())) return setErr("forgotEmail", "Enter a valid email address");
        if (!begin()) return;
        try { await api.forgotPassword({ email: forgotEmail.trim() }); setForgotSent(true); }
        catch (error) { toast.error(error.message || "Could not send reset email"); }
        finally { end(); }
    };
    const goLogin = () => { setScene("login"); setSocialPending(null); setRegisterStep(1); setErrors({}); };
    const goRegister = () => { setScene("register"); setSocialPending(null); setRegisterStep(1); setTermsAgreed(false); setErrors({}); };
    const isRegister = scene === "register";
    const back = isRegister ? (registerStep === 2 ? () => { setRegisterStep(1); setErrors({}); } : goLogin)
        : scene === "login" ? onBack : goLogin;
    const backLabel = scene === "forgot" ? "Back to login" : scene === "link" ? "Use another method" : "Back";
    const contentWidth = Math.min(width, 430) - (width <= 320 ? 40 : 48);
    const namesSideBySide = contentWidth / fontScale >= 324;
    const artWidth = Math.min(width - 24, 406), artHeight = Math.min(280, artWidth / 1.5, Math.max(170, height * 0.32));
    const busy = loading || !!loadingProvider;
    const social = <SocialSignIn onCredential={handleSocialCredential} onError={showSocialError} loadingProvider={loadingProvider} disabled={loading} />;

    const authBlurTarget = useRef(null);
    return <KeyboardAvoider><GlassTargetContext.Provider value={authBlurTarget}><BlurTargetView ref={authBlurTarget} style={{flex:1}}>
        <View style={styles.page}>
            <Gradient pointerEvents="none" colors={p.background} style={StyleSheet.absoluteFill} />
            <ScrollView ref={scroll} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + 24 }]}>
                    <View style={[styles.header, { paddingLeft: space.lg + (insets.left || 0), paddingRight: space.lg + (insets.right || 0) }]}>
                        <View style={styles.headerSide}>{back ? <AuthBackButton onPress={back} disabled={busy} accessibilityLabel={backLabel} /> : null}</View>
                        {isRegister ? <SignupProgressIndicator step={registerStep} /> : <View />}
                        <View style={styles.headerSide} />
                    </View>
                <View style={styles.phoneCanvas}>
                    <Image source={isRegister ? registerStep === 2 ? require("../assets/auth-details-hero.png") : require("../assets/auth-register-hero.png") : require("../assets/auth-login-hero.png")}
                        style={[styles.hero, { width: artWidth, height: artHeight }]} resizeMode="contain"
                        accessibilityLabel={isRegister ? "A parent and the BabyBook+ baby seal sharing an open blue baby book" : "A parent embracing the BabyBook+ baby seal"} />
                    <View style={[styles.formPanel, width <= 320 && { paddingHorizontal: 20 }]}>
                        {scene === "login" ? <>
                            <Heading title="Welcome back" body="Your baby's health, growth, and memories are right where you left them." styles={styles} />
                            <NeumorphicInput icon="mail-outline" label="Email address" placeholder="you@example.com" value={email} onChangeText={value => { setEmail(value); setErr("email", ""); }} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username" />
                            <NeumorphicInput icon="lock-closed-outline" label="Password" placeholder="Enter your password" value={password} onChangeText={value => { setPassword(value); setErr("password", ""); }} error={errors.password} secureTextEntry autoComplete="current-password" textContentType="password" />
                            <Link onPress={() => { setScene("forgot"); setErrors({}); }} label="Forgot password?" style={styles.forgot} />
                            <Button variant="auth" iconPosition="right" loadingIndicator={false} title="Log In" icon="arrow-forward" onPress={handleLogin} loading={loading} disabled={!!loadingProvider} />
                            <Divider label="or continue with" />
                            {social}
                            <InlineSwitch prompt="New to BabyBook+?" action="Create an account" onPress={goRegister} />
                            <Button variant="authSecondary" title="Healthcare professional access"
                                icon={<Image source={require("../assets/navbar/health-blue.png")} resizeMode="contain" accessible={false} style={{ width: 28, height: 28 }} />}
                                onPress={onProfessional} disabled={busy} style={styles.professional} />
                        </> : isRegister ? <>
                            <Heading title={registerStep === 1 ? "Start your BabyBook" : "Tell us a bit more"}
                                body={registerStep === 1 ? "Keep every record, milestone, and memory together from day one." : "This helps us personalize your experience for your little one."} styles={styles} />
                            {registerStep === 1 ? <>
                                {socialPending ? <View style={styles.verified}><Ionicons name="checkmark-circle" size={18} color={colors.success} />
                                    <Text style={styles.verifiedText}>{socialPending.profile.provider} account verified{socialPending.profile.name ? `: ${socialPending.profile.name}. Please confirm your first name and surname.` : ""}</Text></View> : null}
                                <View style={namesSideBySide ? styles.nameRow : undefined}>
                                    <NeumorphicInput icon="person-outline" label="First name" placeholder={namesSideBySide ? "First name" : "Enter your first name"} value={firstName} onChangeText={value => { setFirstName(value); setErr("firstName", ""); }} error={errors.firstName} autoComplete="given-name" textContentType="givenName" autoCapitalize="words" style={namesSideBySide ? styles.nameField : undefined} />
                                    <NeumorphicInput icon="person-outline" label="Surname" placeholder={namesSideBySide ? "Surname" : "Enter your surname"} value={surname} onChangeText={value => { setSurname(value); setErr("surname", ""); }} error={errors.surname} autoComplete="family-name" textContentType="familyName" autoCapitalize="words" style={namesSideBySide ? styles.nameField : undefined} />
                                </View>
                                <NeumorphicInput icon="mail-outline" label="Email address" placeholder="you@example.com" value={regEmail} editable={!socialPending} onChangeText={value => { setRegEmail(value); setErr("regEmail", ""); }} error={errors.regEmail} helper={socialPending ? "Verified by your provider" : "For sign-in and recovery."} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username" />
                                <NeumorphicInput icon="lock-closed-outline" label={socialPending ? "Create a backup password" : "Password"} placeholder="At least 8 characters" value={regPass} onChangeText={value => { setRegPass(value); setErr("regPass", ""); }} error={errors.regPass} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
                                <NeumorphicInput icon="lock-closed-outline" label="Confirm password" placeholder="Enter it again" value={regConfirm} onChangeText={value => { setRegConfirm(value); setErr("regConfirm", ""); }} error={errors.regConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
                                <Button variant="auth" iconPosition="right" title="Continue" icon="arrow-forward" onPress={validateCredentials} disabled={busy} />
                                {!socialPending ? <><Divider label="or sign up with" />{social}</> : null}
                            </> : <>
                                <RelationshipDropdown value={relationship} onChange={value => { setRelationship(value); setErr("relationship", ""); }} error={errors.relationship} />
                                <View style={styles.consentNotice}><Ionicons name="shield-checkmark-outline" size={28} color={p.azure} />
                                    <View style={{ flex: 1 }}><Text style={styles.consentTitle}>Your family's data stays parent-controlled</Text>
                                        <Text style={styles.consentBody}>BabyBook+ stores account and child records for up to six years. You can review, export, or delete them.</Text>
                                        <Link onPress={() => setTermsOpen(true)} label="Read the full privacy agreement" />
                                    </View>
                                </View>
                                <PrivacyCheckbox checked={termsAgreed} disabled={busy} onChange={value => { setTermsAgreed(value); setErr("terms", ""); }} />
                                {errors.terms ? <Text accessibilityRole="alert" style={styles.error}>{errors.terms}</Text> : null}
                                <Button variant="auth" iconPosition="right" loadingIndicator={false} title="Create Account" icon="arrow-forward" onPress={handleRegister} loading={loading} disabled={!!loadingProvider} style={styles.create} />
                            </>}
                        </> : scene === "forgot" ? <>
                            <Heading title="Reset your password" body="Enter your account email and we'll send the next step." styles={styles} />
                            {forgotSent ? <View style={styles.successCard}><Ionicons name="mail-outline" size={28} color={colors.success} /><Text style={styles.successTitle}>Check your inbox</Text><Text style={styles.successBody}>If an account exists for that email, a reset link is on its way.</Text></View> : <>
                                <NeumorphicInput icon="mail-outline" label="Email address" placeholder="you@example.com" value={forgotEmail} onChangeText={value => { setForgotEmail(value); setErr("forgotEmail", ""); }} error={errors.forgotEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                                <Button variant="auth" loadingIndicator={false} title="Send Reset Link" onPress={handleForgot} loading={loading} />
                            </>}
                        </> : <>
                            <Heading title="Confirm it's your account" body={`${socialPending?.profile?.email || "This email"} already has a BabyBook+. Enter its password once to link ${socialPending?.profile?.provider || "this provider"}.`} styles={styles} />
                            <NeumorphicInput icon="lock-closed-outline" label="Current BabyBook+ password" placeholder="Enter your password" value={password} onChangeText={value => { setPassword(value); setErr("password", ""); }} error={errors.password} secureTextEntry autoComplete="current-password" textContentType="password" />
                            <Button variant="auth" loadingIndicator={false} title="Confirm and Link" icon="link-outline" onPress={handleLink} loading={loading} />
                        </>}
                    </View>
                </View>
            </ScrollView>
        </View>
        <PrivacyModal visible={termsOpen} onClose={() => setTermsOpen(false)} colors={colors} />
    </BlurTargetView></GlassTargetContext.Provider></KeyboardAvoider>;
}

function Heading({ title, body, styles }) { return <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.subtitle}>{body}</Text></View>; }
function Divider({ label }) { return <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 16 }}><View style={{ flex: 1, height: 1, backgroundColor: p.separator }} /><Text style={{ ...type.caption, color: p.secondary, marginHorizontal: 12 }}>{label}</Text><View style={{ flex: 1, height: 1, backgroundColor: p.separator }} /></View>; }
function Link({ onPress, label, icon, style }) { return <TouchableOpacity onPress={onPress} accessibilityRole="button" style={[{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: 4 }, style]}>{icon ? <Ionicons name={icon} size={18} color={p.azure} /> : null}<Text style={{ ...type.label, color: p.azure, flexShrink: 1 }}>{label}</Text></TouchableOpacity>; }
function InlineSwitch({ prompt, action, onPress }) { return <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", marginTop: 8 }}><Text style={{ ...type.caption, color: p.secondary }}>{prompt} </Text><TouchableOpacity onPress={onPress} accessibilityRole="button" style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}><Text style={{ ...type.label, color: p.azure }}>{action}</Text></TouchableOpacity></View>; }
function PrivacyModal({ visible, onClose, colors }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={modalStyles.backdrop}><View style={[modalStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ ...type.title, color: colors.text }}>Privacy and data retention</Text><ScrollView style={{ maxHeight: 380 }}><Text style={{ ...type.body, color: colors.textSecondary }}>BabyBook+ collects the caregiver account details and the child health, growth, appointment, and memory records you choose to add. We use them only to provide the app, synchronize your records, and enable temporary parent-controlled sharing with a healthcare professional.{"\n\n"}Records are retained for up to six years unless you delete your account sooner. Sensitive profile fields are encrypted at rest. You may view, correct, export, or permanently delete your data from Settings, and you may withdraw consent at any time by deleting the account.{"\n\n"}By creating an account, you confirm that you are authorized to manage the child’s information and consent to this processing under the Philippines Data Privacy Act of 2012.</Text></ScrollView><Button title="Close" onPress={onClose} /></View></View></Modal>; }

const modalStyles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "center", padding: space.lg }, card: { width: "100%", maxWidth: 430, alignSelf: "center", borderWidth: 1, borderRadius: radius.xl, padding: space.xl, gap: space.lg } });
const makeStyles = colors => StyleSheet.create({
    page: { flex: 1, backgroundColor: p.background[0] },
    scroll: { flexGrow: 1, alignItems: "center" },
    phoneCanvas: { width: "100%", maxWidth: 430, alignSelf: "center" },
    header: { height: MIN_TOUCH, alignSelf: "stretch", paddingHorizontal: space.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerSide: { width: MIN_TOUCH },
    hero: { alignSelf: "center", marginTop: 6, marginBottom: 12 },
    formPanel: { paddingHorizontal: 24 },
    heading: { alignItems: "center", gap: 8, marginBottom: 20 },
    title: { fontFamily: "PublicSans_700Bold", fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.5, color: p.title, textAlign: "center" },
    subtitle: { ...type.body, color: p.secondary, textAlign: "center", lineHeight: 23 },
    forgot: { alignSelf: "flex-end", marginTop: -8, marginBottom: 8 },
    professional: { marginTop: 8 },
    nameRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" }, nameField: { flex: 1, minWidth: 0 },
    verified: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
    verifiedText: { ...type.caption, color: colors.success, flex: 1 },
    consentNotice: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 8 },
    consentTitle: { ...type.bodyStrong, color: p.title, marginBottom: 6 },
    consentBody: { ...type.body, fontSize: 14, lineHeight: 21, color: p.secondary },
    error: { ...type.caption, color: colors.danger, marginBottom: 12 },
    create: { marginTop: 12 },
    successCard: { alignItems: "center", gap: space.sm, borderRadius: radius.lg, backgroundColor: colors.successBg, padding: space.xl },
    successTitle: { ...type.heading, color: colors.success, textTransform: "capitalize" },
    successBody: { ...type.body, color: colors.textSecondary, textAlign: "center" },
});
