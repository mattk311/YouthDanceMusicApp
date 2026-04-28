import Header from '../Header';

export default function HeaderExample() {
  return (
    <Header 
      user={{
        name: "Sarah Johnson",
        email: "sarah@church.org",
      }}
      onLogout={() => console.log('Logout clicked')}
    />
  );
}
