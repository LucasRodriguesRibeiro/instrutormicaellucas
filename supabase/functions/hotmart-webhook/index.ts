// ============================================================================
// SUPABASE EDGE FUNCTION: hotmart-webhook
// Como instalar no painel do Supabase (sem precisar de terminal):
// 1. No menu lateral do Supabase, clique em "Edge Functions"
// 2. Clique em "Deploy a new function" -> "Via Editor"
// 3. Nome da função: hotmart-webhook
// 4. IMPORTANTE: Nas configurações da função, DESMARQUE "Enforce JWT Verification"
//    (pois a Hotmart envia o cabeçalho X-Hotmart-Hottok, e não um JWT do Supabase).
// 5. Cole este código e clique em "Deploy".
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 1. Validação opcional do Hottok da Hotmart (se configurado em Edge Functions -> Secrets)
    const expectedHottok = Deno.env.get('HOTMART_HOTTOK');
    const receivedHottok =
      req.headers.get('x-hotmart-hottok') ||
      new URL(req.url).searchParams.get('hottok') ||
      '';

    if (expectedHottok && receivedHottok !== expectedHottok) {
      return new Response(JSON.stringify({ error: 'Unauthorized Hottok' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();

    // 2. Extração compatível com Webhook Hotmart v2.0.0 e v1.0
    const event: string = String(payload?.event || payload?.status || '').toUpperCase();
    const buyer = payload?.data?.buyer || payload?.buyer || {};
    const purchase = payload?.data?.purchase || payload?.purchase || {};

    const rawEmail: string = String(buyer?.email || payload?.email || '').trim().toLowerCase();
    const nome: string = String(buyer?.name || payload?.name || 'Aluno').trim();
    const transacao: string = String(
      purchase?.transaction || payload?.transaction || ''
    ).trim();

    if (!rawEmail || !rawEmail.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email ausente no payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Mapeamento do evento da Hotmart para o status do aluno
    const eventosAtivar = new Set([
      'PURCHASE_APPROVED',
      'PURCHASE_COMPLETE',
      'APPROVED',
      'COMPLETED',
    ]);

    const eventosBloquear: Record<string, string> = {
      PURCHASE_REFUNDED: 'reembolsado',
      PURCHASE_CHARGEBACK: 'reembolsado',
      REFUNDED: 'reembolsado',
      CHARGEBACK: 'reembolsado',
      PURCHASE_CANCELED: 'cancelado',
      PURCHASE_PROTEST: 'cancelado',
      PURCHASE_EXPIRED: 'cancelado',
      SUBSCRIPTION_CANCELLATION: 'cancelado',
      CANCELED: 'cancelado',
    };

    let novoStatus: string | null = null;
    if (eventosAtivar.has(event)) {
      novoStatus = 'ativo';
    } else if (eventosBloquear[event]) {
      novoStatus = eventosBloquear[event];
    } else {
      // Eventos informativos (ex: PURCHASE_BILLET_PRINTED, WAITING_PAYMENT) são ignorados sem erro
      return new Response(JSON.stringify({ ignored: true, event }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Gravação no banco com Prefer: return=minimal (Zero Egress desnecessário)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const dbRes = await fetch(
      `${supabaseUrl}/rest/v1/alunos_autorizados?on_conflict=email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          email: rawEmail,
          nome,
          status: novoStatus,
          origem: 'hotmart',
          transacao: transacao || null,
          evento_ultimo: event,
        }),
      }
    );

    if (!dbRes.ok) {
      const errText = await dbRes.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

