import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { inconsistencyId, action, notes } = req.body;

  if (!inconsistencyId) {
    return res.status(400).json({ message: 'ID da inconsistência é obrigatório' });
  }

  try {
    // Aqui você implementaria a lógica para resolver a inconsistência
    // Por exemplo: atualizar banco de dados, enviar notificação, etc.
    
    // Por enquanto, vamos simular uma resolução
    const resolution = {
      id: inconsistencyId,
      action: action || 'marked_resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'Sistema', // Poderia ser o usuário logado
      notes: notes || 'Inconsistência resolvida automaticamente',
      status: 'resolved'
    };

    // Simular um tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 500));

    res.status(200).json({
      message: 'Inconsistência resolvida com sucesso',
      resolution
    });
  } catch (error) {
    console.error('Erro na API resolve-inconsistency:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
}