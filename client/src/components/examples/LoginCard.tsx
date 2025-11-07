import LoginCard from '../LoginCard';

export default function LoginCardExample() {
  return <LoginCard onGoogleLogin={() => console.log('Google login clicked')} />;
}
