import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Query de busca é obrigatória' });
  }

  try {
    // Buscar dados completos do dashboard
    const dashboardResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/dashboard-data`);
    const dashboardData = await dashboardResponse.json();

    if (!dashboardData.customers) {
      return res.status(500).json({ message: 'Erro ao buscar dados dos clientes' });
    }

    // Filtrar clientes por nome, CPF/CNPJ
    const filteredCustomers = dashboardData.customers.filter((customer: any) => {
      const searchTerm = query.toLowerCase();
      const customerName = (customer.nome || '').toLowerCase();
      const customerCpf = (customer.cpf_cnpj || '').toLowerCase();
      const customerEmail = (customer.email || '').toLowerCase();

      return customerName.includes(searchTerm) || 
             customerCpf.includes(searchTerm) || 
             customerEmail.includes(searchTerm);
    });

    res.status(200).json({
      customers: filteredCustomers,
      total: filteredCustomers.length
    });
  } catch (error) {
    console.error('Erro na API search-customers:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
}