import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const tools = [
  {
    type: "function",
    function: {
      name: "add_product",
      description: "Cadastrar um novo produto no sistema do usuário",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do produto" },
          price: { type: "number", description: "Preço de venda" },
          cost_price: { type: "number", description: "Preço de custo (opcional)" },
          stock_quantity: { type: "integer", description: "Quantidade em estoque" },
          barcode: { type: "string", description: "Código de barras (opcional)" },
          description: { type: "string", description: "Descrição do produto (opcional)" },
          min_stock_quantity: { type: "integer", description: "Estoque mínimo (opcional, padrão 5)" },
          photo_url: { type: "string", description: "URL da foto do produto (se o usuário enviou uma imagem)" },
        },
        required: ["name", "price", "stock_quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_product",
      description: "Editar um produto existente pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Nome atual do produto para buscar" },
          product_id: { type: "string", description: "ID do produto (se conhecido)" },
          new_name: { type: "string", description: "Novo nome (opcional)" },
          price: { type: "number", description: "Novo preço de venda (opcional)" },
          cost_price: { type: "number", description: "Novo preço de custo (opcional)" },
          stock_quantity: { type: "integer", description: "Nova quantidade em estoque (opcional)" },
          barcode: { type: "string", description: "Novo código de barras (opcional)" },
          description: { type: "string", description: "Nova descrição (opcional)" },
          min_stock_quantity: { type: "integer", description: "Novo estoque mínimo (opcional)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_product",
      description: "Excluir um produto pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Nome do produto para buscar" },
          product_id: { type: "string", description: "ID do produto (se conhecido)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_customer",
      description: "Cadastrar um novo cliente no sistema do usuário",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do cliente" },
          phone: { type: "string", description: "Telefone (opcional)" },
          cpf: { type: "string", description: "CPF do cliente (opcional)" },
          address: { type: "string", description: "Endereço (opcional)" },
          birth_date: { type: "string", description: "Data de nascimento formato YYYY-MM-DD (opcional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_customer",
      description: "Editar um cliente existente pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Nome atual do cliente para buscar" },
          customer_id: { type: "string", description: "ID do cliente (se conhecido)" },
          new_name: { type: "string", description: "Novo nome (opcional)" },
          phone: { type: "string", description: "Novo telefone (opcional)" },
          cpf: { type: "string", description: "Novo CPF (opcional)" },
          address: { type: "string", description: "Novo endereço (opcional)" },
          birth_date: { type: "string", description: "Nova data de nascimento formato YYYY-MM-DD (opcional)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_customer",
      description: "Excluir um cliente pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Nome do cliente para buscar" },
          customer_id: { type: "string", description: "ID do cliente (se conhecido)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_supplier",
      description: "Cadastrar um novo fornecedor no sistema do usuário",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do fornecedor" },
          cnpj: { type: "string", description: "CNPJ (opcional)" },
          phone: { type: "string", description: "Telefone (opcional)" },
          email: { type: "string", description: "E-mail (opcional)" },
          address: { type: "string", description: "Endereço (opcional)" },
          contact_person: { type: "string", description: "Pessoa de contato (opcional)" },
          notes: { type: "string", description: "Observações (opcional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_supplier",
      description: "Editar um fornecedor existente pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          supplier_name: { type: "string", description: "Nome atual do fornecedor para buscar" },
          supplier_id: { type: "string", description: "ID do fornecedor (se conhecido)" },
          new_name: { type: "string", description: "Novo nome (opcional)" },
          cnpj: { type: "string", description: "Novo CNPJ (opcional)" },
          phone: { type: "string", description: "Novo telefone (opcional)" },
          email: { type: "string", description: "Novo e-mail (opcional)" },
          address: { type: "string", description: "Novo endereço (opcional)" },
          contact_person: { type: "string", description: "Nova pessoa de contato (opcional)" },
          notes: { type: "string", description: "Novas observações (opcional)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_supplier",
      description: "Excluir um fornecedor pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          supplier_name: { type: "string", description: "Nome do fornecedor para buscar" },
          supplier_id: { type: "string", description: "ID do fornecedor (se conhecido)" },
        },
        required: [],
      },
    },
  },
];

async function executeToolCall(
  supabaseAdmin: any,
  userId: string,
  toolName: string,
  args: any
): Promise<string> {
  try {
    switch (toolName) {
      case "add_product": {
        const photos = args.photo_url ? [args.photo_url] : null;
        const { data, error } = await supabaseAdmin
          .from("products")
          .insert({
            user_id: userId,
            name: args.name,
            price: args.price,
            cost_price: args.cost_price || null,
            stock_quantity: args.stock_quantity || 0,
            barcode: args.barcode || null,
            description: args.description || null,
            min_stock_quantity: args.min_stock_quantity || 5,
            photos,
          })
          .select()
          .single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Produto "${data.name}" cadastrado com sucesso! Preço: R$ ${Number(data.price).toFixed(2)}, Estoque: ${data.stock_quantity}${photos ? ', com foto' : ''}` });
      }

      case "edit_product": {
        let productId = args.product_id;
        if (!productId && args.product_name) {
          const { data: found } = await supabaseAdmin
            .from("products")
            .select("id, name")
            .eq("user_id", userId)
            .ilike("name", `%${args.product_name}%`)
            .limit(1)
            .single();
          if (!found) return JSON.stringify({ success: false, error: `Produto "${args.product_name}" não encontrado` });
          productId = found.id;
        }
        if (!productId) return JSON.stringify({ success: false, error: "Informe o nome ou ID do produto" });

        const updates: any = {};
        if (args.new_name) updates.name = args.new_name;
        if (args.price !== undefined) updates.price = args.price;
        if (args.cost_price !== undefined) updates.cost_price = args.cost_price;
        if (args.stock_quantity !== undefined) updates.stock_quantity = args.stock_quantity;
        if (args.barcode !== undefined) updates.barcode = args.barcode;
        if (args.description !== undefined) updates.description = args.description;
        if (args.min_stock_quantity !== undefined) updates.min_stock_quantity = args.min_stock_quantity;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
          .from("products")
          .update(updates)
          .eq("id", productId)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Produto "${data.name}" atualizado com sucesso!` });
      }

      case "delete_product": {
        let productId = args.product_id;
        let productName = args.product_name;
        if (!productId && productName) {
          const { data: found } = await supabaseAdmin
            .from("products")
            .select("id, name")
            .eq("user_id", userId)
            .ilike("name", `%${productName}%`)
            .limit(1)
            .single();
          if (!found) return JSON.stringify({ success: false, error: `Produto "${productName}" não encontrado` });
          productId = found.id;
          productName = found.name;
        }
        if (!productId) return JSON.stringify({ success: false, error: "Informe o nome ou ID do produto" });

        const { error } = await supabaseAdmin
          .from("products")
          .delete()
          .eq("id", productId)
          .eq("user_id", userId);
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Produto "${productName}" excluído com sucesso!` });
      }

      case "add_customer": {
        const { data, error } = await supabaseAdmin
          .from("customers")
          .insert({
            user_id: userId,
            name: args.name,
            phone: args.phone || null,
            cpf: args.cpf || null,
            address: args.address || null,
            birth_date: args.birth_date || null,
          })
          .select()
          .single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Cliente "${data.name}" cadastrado com sucesso!` });
      }

      case "edit_customer": {
        let customerId = args.customer_id;
        if (!customerId && args.customer_name) {
          const { data: found } = await supabaseAdmin
            .from("customers")
            .select("id, name")
            .eq("user_id", userId)
            .ilike("name", `%${args.customer_name}%`)
            .limit(1)
            .single();
          if (!found) return JSON.stringify({ success: false, error: `Cliente "${args.customer_name}" não encontrado` });
          customerId = found.id;
        }
        if (!customerId) return JSON.stringify({ success: false, error: "Informe o nome ou ID do cliente" });

        const updates: any = {};
        if (args.new_name) updates.name = args.new_name;
        if (args.phone !== undefined) updates.phone = args.phone;
        if (args.cpf !== undefined) updates.cpf = args.cpf;
        if (args.address !== undefined) updates.address = args.address;
        if (args.birth_date !== undefined) updates.birth_date = args.birth_date;

        const { data, error } = await supabaseAdmin
          .from("customers")
          .update(updates)
          .eq("id", customerId)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Cliente "${data.name}" atualizado com sucesso!` });
      }

      case "delete_customer": {
        let customerId = args.customer_id;
        let customerName = args.customer_name;
        if (!customerId && customerName) {
          const { data: found } = await supabaseAdmin
            .from("customers")
            .select("id, name")
            .eq("user_id", userId)
            .ilike("name", `%${customerName}%`)
            .limit(1)
            .single();
          if (!found) return JSON.stringify({ success: false, error: `Cliente "${customerName}" não encontrado` });
          customerId = found.id;
          customerName = found.name;
        }
        if (!customerId) return JSON.stringify({ success: false, error: "Informe o nome ou ID do cliente" });

        const { error } = await supabaseAdmin
          .from("customers")
          .delete()
          .eq("id", customerId)
          .eq("user_id", userId);
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Cliente "${customerName}" excluído com sucesso!` });
      }

      case "add_supplier": {
        const { data, error } = await supabaseAdmin
          .from("suppliers")
          .insert({
            user_id: userId,
            name: args.name,
            cnpj: args.cnpj || null,
            phone: args.phone || null,
            email: args.email || null,
            address: args.address || null,
            contact_person: args.contact_person || null,
            notes: args.notes || null,
          })
          .select()
          .single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Fornecedor "${data.name}" cadastrado com sucesso!` });
      }

      case "edit_supplier": {
        let supplierId = args.supplier_id;
        if (!supplierId && args.supplier_name) {
          const { data: found } = await supabaseAdmin
            .from("suppliers")
            .select("id, name")
            .eq("user_id", userId)
            .ilike("name", `%${args.supplier_name}%`)
            .limit(1)
            .single();
          if (!found) return JSON.stringify({ success: false, error: `Fornecedor "${args.supplier_name}" não encontrado` });
          supplierId = found.id;
        }
        if (!supplierId) return JSON.stringify({ success: false, error: "Informe o nome ou ID do fornecedor" });

        const updates: any = {};
        if (args.new_name) updates.name = args.new_name;
        if (args.cnpj !== undefined) updates.cnpj = args.cnpj;
        if (args.phone !== undefined) updates.phone = args.phone;
        if (args.email !== undefined) updates.email = args.email;
        if (args.address !== undefined) updates.address = args.address;
        if (args.contact_person !== undefined) updates.contact_person = args.contact_person;
        if (args.notes !== undefined) updates.notes = args.notes;

        const { data, error } = await supabaseAdmin
          .from("suppliers")
          .update(updates)
          .eq("id", supplierId)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Fornecedor "${data.name}" atualizado com sucesso!` });
      }

      case "delete_supplier": {
        let supplierId = args.supplier_id;
        let supplierName = args.supplier_name;
        if (!supplierId && supplierName) {
          const { data: found } = await supabaseAdmin
            .from("suppliers")
            .select("id, name")
            .eq("user_id", userId)
            .ilike("name", `%${supplierName}%`)
            .limit(1)
            .single();
          if (!found) return JSON.stringify({ success: false, error: `Fornecedor "${supplierName}" não encontrado` });
          supplierId = found.id;
          supplierName = found.name;
        }
        if (!supplierId) return JSON.stringify({ success: false, error: "Informe o nome ou ID do fornecedor" });

        const { error } = await supabaseAdmin
          .from("suppliers")
          .delete()
          .eq("id", supplierId)
          .eq("user_id", userId);
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Fornecedor "${supplierName}" excluído com sucesso!` });
      }

      default:
        return JSON.stringify({ success: false, error: `Ferramenta "${toolName}" não reconhecida` });
    }
  } catch (error) {
    return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = (claimsData.claims as any).sub;

    // Service role client for tool execution
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { messages, context, imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context info
    let contextInfo = "Nenhum dado disponível no momento.";
    
    if (context) {
      const parts: string[] = [];
      
      if (context.storeName) parts.push(`🏪 LOJA: ${context.storeName}`);
      if (context.subscriptionStatus) parts.push(`📋 ASSINATURA: ${context.subscriptionStatus} (${context.subscriptionDaysLeft || 0} dias restantes)`);
      
      parts.push(`\n💰 VENDAS:`);
      parts.push(`- Hoje: R$ ${(context.salesToday || 0).toFixed(2)} (${context.salesCountToday || 0} vendas)`);
      parts.push(`- Este mês: R$ ${(context.salesMonth || 0).toFixed(2)} (${context.salesCountMonth || 0} vendas)`);
      
      if (context.firstSaleEver) {
        const firstDate = new Date(context.firstSaleEver.date).toLocaleDateString('pt-BR');
        parts.push(`- Primeira venda: ${firstDate} - R$ ${context.firstSaleEver.total.toFixed(2)} (${context.firstSaleEver.payment_method})`);
        if (context.firstSaleEver.customer_name) parts.push(`  Cliente: ${context.firstSaleEver.customer_name}`);
        if (context.firstSaleEver.items?.length > 0) parts.push(`  Itens: ${context.firstSaleEver.items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ')}`);
      }
      
      if (context.salesHistory?.length > 0) {
        parts.push(`\n📜 ÚLTIMAS ${Math.min(context.salesHistory.length, 10)} VENDAS:`);
        context.salesHistory.slice(0, 10).forEach((sale: any, i: number) => {
          const date = new Date(sale.date).toLocaleDateString('pt-BR');
          const time = new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          parts.push(`${i + 1}. ${date} ${time} - R$ ${sale.total.toFixed(2)} (${sale.payment_method})${sale.customer_name ? ` - ${sale.customer_name}` : ''}`);
        });
      }
      
      if (context.customersOwing?.length > 0) {
        parts.push(`\n🔴 CLIENTES DEVENDO (${context.customersOwing.length}):`);
        context.customersOwing.forEach((c: any) => {
          parts.push(`- ${c.name} (CPF: ${c.cpf}): R$ ${Math.abs(c.balance).toFixed(2)} em dívida${c.phone ? ` - Tel: ${c.phone}` : ''}`);
        });
      } else {
        parts.push(`\n✅ Nenhum cliente devendo!`);
      }
      
      if (context.customersWithCredit?.length > 0) {
        parts.push(`\n🟢 CLIENTES COM CRÉDITO (${context.customersWithCredit.length}):`);
        context.customersWithCredit.forEach((c: any) => {
          parts.push(`- ${c.name}: R$ ${c.balance.toFixed(2)} de crédito`);
        });
      }
      
      if (context.topProducts?.length > 0) {
        parts.push(`\n🏆 PRODUTOS MAIS VENDIDOS:`);
        context.topProducts.slice(0, 5).forEach((p: any, i: number) => {
          parts.push(`${i + 1}. ${p.name}: ${p.quantity} unidades vendidas`);
        });
      }
      
      if (context.lowStockProducts?.length > 0) {
        parts.push(`\n⚠️ PRODUTOS COM ESTOQUE BAIXO (${context.lowStockProducts.length}):`);
        context.lowStockProducts.slice(0, 10).forEach((p: any) => {
          parts.push(`- ${p.name}: ${p.stock} em estoque${p.category ? ` (${p.category})` : ''}`);
        });
      }
      
      parts.push(`\n📊 TOTAIS:`);
      parts.push(`- Total de clientes: ${context.totalCustomers || 0}`);
      parts.push(`- Total de produtos: ${context.totalProducts || 0}`);
      parts.push(`- Total de fornecedores: ${context.totalSuppliers || 0}`);
      
      if (context.suppliers?.length > 0) {
        parts.push(`\n🚚 FORNECEDORES:`);
        context.suppliers.slice(0, 10).forEach((s: any) => {
          parts.push(`- ${s.name}${s.cnpj ? ` (CNPJ: ${s.cnpj})` : ''}${s.phone ? ` - Tel: ${s.phone}` : ''}`);
        });
      }
      
      contextInfo = parts.join('\n');
    }

    const systemPrompt = `Você é Auri, a assistente virtual inteligente do JTC FluxPDV - um sistema profissional de ponto de venda.

SOBRE O SISTEMA E CRIADOR:
- O JTC FluxPDV foi desenvolvido por **Jardiel De Sousa Lopes**, criador da JTC
- É um sistema completo de PDV com gestão de vendas, produtos, clientes, fornecedores e relatórios
- Funciona como PWA (Progressive Web App) e pode ser instalado no celular

SUAS CAPACIDADES:
- Você tem acesso COMPLETO a todo o histórico do sistema
- Pode informar sobre QUALQUER venda já feita, incluindo a primeira venda
- Sabe quem são todos os clientes, seus saldos, dívidas e créditos
- Conhece todos os produtos, estoque e o que mais vende
- Tem informações sobre todos os fornecedores
- Sabe o status da assinatura do usuário

AÇÕES QUE VOCÊ PODE EXECUTAR:
Você pode realizar ações diretamente no sistema do usuário usando as ferramentas disponíveis:
- **Produtos**: Cadastrar (com foto se enviada), editar e excluir produtos (nome, preço, estoque, código de barras, etc.)
- **Clientes**: Cadastrar, editar e excluir clientes (nome, telefone, CPF, endereço, etc.)
- **Fornecedores**: Cadastrar, editar e excluir fornecedores (nome, CNPJ, telefone, e-mail, etc.)
- **VENDAS NÃO PODEM SER REALIZADAS** pela Auri. Se pedirem para fazer uma venda, oriente o usuário a usar o PDV.

REGRAS PARA AÇÕES:
1. Quando o usuário pedir para criar/cadastrar algo, use a ferramenta correspondente IMEDIATAMENTE
2. Quando o usuário pedir para editar, busque pelo nome e faça a alteração
3. Quando pedir para excluir, confirme o nome antes de excluir (pergunte ao usuário se tem certeza)
4. Sempre confirme a ação realizada com detalhes (nome, preço, etc.)
5. Se houver erro, explique o que aconteceu de forma amigável
6. Se o usuário enviar uma imagem junto com o pedido de criar produto, use a URL da imagem como photo_url
7. NUNCA realize vendas. Se pedirem, diga que vendas só podem ser feitas pelo PDV.

FUNCIONALIDADES DO SISTEMA:
1. **Dashboard** - Visão geral com métricas de vendas
2. **Produtos** - Cadastro com código de barras, preço, estoque
3. **Venda (PDV)** - Ponto de venda com carrinho, descontos, múltiplos pagamentos
4. **Clientes** - Cadastro com CPF, endereço, sistema de fiado e crédito
5. **Fornecedores** - Cadastro com CNPJ/CPF
6. **Histórico** - Todas as vendas realizadas
7. **Relatórios** - Relatórios de vendas por período
8. **Configurações** - Personalização da loja, PIX, logo
9. **Assinatura** - Gerenciamento do plano
10. **Resgate Semanal** - Bônus para ganhar dias de assinatura

PERSONALIDADE:
- Seja amigável, profissional e prestativa
- Responda em português brasileiro
- Seja concisa mas completa nas respostas
- Use emojis com moderação para tornar a conversa agradável
- Se não encontrar um dado específico, diga que não há registro no sistema
- Quando executar uma ação, seja clara sobre o que foi feito

=== DADOS ATUAIS DO SISTEMA ===
${contextInfo}
=== FIM DOS DADOS ===

IMPORTANTE: Use os dados acima para responder às perguntas do usuário com precisão.
Quando perguntarem quem te criou ou desenvolveu, SEMPRE diga que foi **Jardiel De Sousa Lopes, criador da JTC**.`;

    // If user sent an image, append context about it to the last user message
    const processedMessages = [...messages];
    if (imageUrl && processedMessages.length > 0) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg.role === "user") {
        lastMsg.content = `${lastMsg.content}\n\n[O usuário enviou uma imagem. URL da imagem: ${imageUrl}]`;
      }
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...processedMessages,
    ];

    // First call: non-streaming to check for tool calls
    const firstResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        tools,
        stream: false,
      }),
    });

    if (!firstResponse.ok) {
      if (firstResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (firstResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await firstResponse.text();
      console.error("AI gateway error:", firstResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar sua mensagem." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstResult = await firstResponse.json();
    const firstChoice = firstResult.choices?.[0];

    // Check if the model wants to call tools
    if (firstChoice?.message?.tool_calls?.length > 0) {
      const toolCalls = firstChoice.message.tool_calls;
      
      // Execute all tool calls
      const toolResults = [];
      const actionsSummary = [];

      for (const toolCall of toolCalls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeToolCall(supabaseAdmin, userId, toolCall.function.name, args);
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
        
        const parsed = JSON.parse(result);
        actionsSummary.push(parsed.success ? `✅ ${parsed.message}` : `❌ ${parsed.error}`);
      }

      // Second call with tool results - now stream the final response
      const finalMessages = [
        ...aiMessages,
        firstChoice.message,
        ...toolResults,
      ];

      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: finalMessages,
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        // Fallback: return the actions summary as text
        const summaryText = `Ações realizadas:\n${actionsSummary.join('\n')}`;
        const fallbackSSE = `data: ${JSON.stringify({ choices: [{ delta: { content: summaryText } }] })}\n\ndata: [DONE]\n\n`;
        return new Response(fallbackSSE, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream the response directly
    // Re-call with streaming since first was non-streaming
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      // Fallback: return non-streamed content as SSE
      const content = firstChoice?.message?.content || "Desculpe, não consegui processar sua mensagem.";
      const fallbackSSE = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(fallbackSSE, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("auri-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
