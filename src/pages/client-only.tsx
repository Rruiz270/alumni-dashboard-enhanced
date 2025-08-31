import dynamic from 'next/dynamic';

// This component will only render on the client side
const ClientOnlyDashboard = dynamic(() => import('../components/ClientDashboard'), {
  ssr: false,
  loading: () => <div style={{ padding: '20px' }}>Loading...</div>
});

export default function ClientOnly() {
  return <ClientOnlyDashboard />;
}