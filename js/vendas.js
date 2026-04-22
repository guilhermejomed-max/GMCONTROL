let vendaPendente = null;
let itemEcoPendente = null;
let carrinhoVenda = [];

function obterNomeProdutoVenda(produto) {
    if (!produto) return 'Produto';
    const partes = [produto.marca, produto.nome_peca].map(v => String(v || '').trim()).filter(Boolean);
    return partes.join(' ') || produto.modelo || 'Produto';
}

function gerarNumeroOrcamento() {
    return 'ORC-' + String(Date.now()).slice(-8);
}

function resumoItensVenda(itens) {
    const lista = Array.isArray(itens) ? itens : [];
    if (!lista.length) return 'Item';
    if (lista.length === 1) {
        const item = lista[0];
        return `${item.nome || 'Item'} x${item.qtd || 1}`;
    }
    const totalPecas = lista.reduce((acc, item) => acc + (parseInt(item.qtd) || 0), 0);
    return `${lista.length} itens (${totalPecas} peças)`;
}

function normalizarItensDocumento(doc) {
    if (Array.isArray(doc?.itens) && doc.itens.length) {
        return doc.itens.map(item => ({
            id: item.id || item.produtoId || '',
            produtoId: item.produtoId || item.id || '',
            nome: item.nome || item.peca || 'Item',
            marca: item.marca || '',
            nome_peca: item.nome_peca || '',
            codigo: item.codigo || '',
            qtd: parseInt(item.qtd) || 1,
            unitario: parseFloat(item.unitario) || 0,
            total: parseFloat(item.total) || ((parseInt(item.qtd) || 1) * (parseFloat(item.unitario) || 0)),
            origem: item.origem || doc?.origem || 'BALCAO'
        }));
    }

    return [{
        id: doc?.produtoId || '',
        produtoId: doc?.produtoId || '',
        nome: doc?.peca || 'Item',
        marca: doc?.marca || '',
        nome_peca: doc?.nome_peca || '',
        codigo: doc?.codigo || '',
        qtd: parseInt(doc?.qtd) || 1,
        unitario: parseFloat(doc?.unitario) || 0,
        total: parseFloat(doc?.venda) || 0,
        origem: doc?.origem || 'BALCAO'
    }];
}

function totalCarrinhoVenda() {
    return carrinhoVenda.reduce((acc, item) => acc + ((parseInt(item.qtd) || 0) * (parseFloat(item.unitario) || 0)), 0);
}

function totalItensCarrinhoVenda() {
    return carrinhoVenda.reduce((acc, item) => acc + (parseInt(item.qtd) || 0), 0);
}

function renderizarCarrinhoVenda() {
    const corpo = document.getElementById('corpo-carrinho-venda');
    const vazio = document.getElementById('painel-carrinho-vazio');
    const tabela = document.getElementById('painel-carrinho-tabela');
    const totalEl = document.getElementById('total-carrinho-venda');
    const itensEl = document.getElementById('total-itens-carrinho');
    if (!corpo || !vazio || !tabela || !totalEl || !itensEl) return;

    if (!carrinhoVenda.length) {
        corpo.innerHTML = '';
        vazio.style.display = 'block';
        tabela.style.display = 'none';
        totalEl.innerText = 'R$ 0,00';
        itensEl.innerText = '0';
        return;
    }

    vazio.style.display = 'none';
    tabela.style.display = 'block';
    corpo.innerHTML = carrinhoVenda.map((item, index) => {
        const total = (parseInt(item.qtd) || 0) * (parseFloat(item.unitario) || 0);
        return `<tr>
            <td>
                <div style="font-weight:800; color:var(--text-main);">${item.nome}</div>
                <div style="font-size:12px; color:var(--text-muted);">${item.codigo || 'Sem código'}</div>
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="btn btn-sm btn-secondary" onclick="alterarQtdCarrinho(${index}, -1)">-</button>
                    <span style="min-width:24px; text-align:center; font-weight:800;">${item.qtd}</span>
                    <button class="btn btn-sm btn-secondary" onclick="alterarQtdCarrinho(${index}, 1)">+</button>
                </div>
            </td>
            <td>R$ ${(parseFloat(item.unitario) || 0).toFixed(2)}</td>
            <td style="font-weight:800;">R$ ${total.toFixed(2)}</td>
            <td style="text-align:right;"><button class="btn btn-sm btn-secondary" onclick="removerItemCarrinho(${index})"><i class="ri-delete-bin-line"></i></button></td>
        </tr>`;
    }).join('');

    totalEl.innerText = `R$ ${totalCarrinhoVenda().toFixed(2)}`;
    itensEl.innerText = String(totalItensCarrinhoVenda());
}

function limparCarrinhoVenda(limparCliente = false) {
    carrinhoVenda = [];
    vendaPendente = null;
    renderizarCarrinhoVenda();
    if (limparCliente) {
        const nome = document.getElementById('cli-nome');
        const pgto = document.getElementById('cli-pgto');
        const boleto = document.getElementById('cli-boleto-select');
        const validade = document.getElementById('orc-validade');
        const observacao = document.getElementById('orc-observacao');
        if (nome) nome.value = '';
        if (pgto) pgto.value = 'DINHEIRO';
        if (boleto) boleto.value = '';
        if (validade) validade.value = '';
        if (observacao) observacao.value = '';
        mostrarSelecaoCliente();
    }
}

function removerItemCarrinho(index) {
    carrinhoVenda.splice(index, 1);
    renderizarCarrinhoVenda();
}

function alterarQtdCarrinho(index, delta) {
    const item = carrinhoVenda[index];
    if (!item) return;
    const produto = (cacheEstoque || []).find(p => p.id === item.id);
    const estoqueAtual = parseInt(produto?.qtd) || 0;
    const novaQtd = (parseInt(item.qtd) || 0) + delta;

    if (novaQtd <= 0) {
        removerItemCarrinho(index);
        return;
    }

    if (estoqueAtual && novaQtd > estoqueAtual) {
        return alert(`Estoque disponível para ${item.nome}: ${estoqueAtual}`);
    }

    item.qtd = novaQtd;
    renderizarCarrinhoVenda();
}

function adicionarProdutoAoCarrinho(produto, qtd, origem = 'BALCAO', unitarioOverride = null) {
    const quantidade = parseInt(qtd) || 1;
    const unitario = unitarioOverride != null ? parseFloat(unitarioOverride) || 0 : parseFloat(produto?.repasse) || 0;
    const nome = obterNomeProdutoVenda(produto);
    const existente = carrinhoVenda.find(item => item.id === produto.id && item.unitario === unitario && item.origem === origem);
    const estoqueAtual = parseInt(produto?.qtd) || 0;
    const qtdFinal = (existente ? parseInt(existente.qtd) || 0 : 0) + quantidade;

    if (estoqueAtual && qtdFinal > estoqueAtual) {
        return alert(`Estoque disponível para ${nome}: ${estoqueAtual}`);
    }

    if (existente) {
        existente.qtd = qtdFinal;
    } else {
        carrinhoVenda.push({
            id: produto.id,
            produtoId: produto.id,
            nome,
            marca: produto.marca || '',
            nome_peca: produto.nome_peca || '',
            codigo: produto.codigo || '',
            qtd: quantidade,
            unitario,
            origem
        });
    }

    renderizarCarrinhoVenda();
    Toastify({ text: `${nome} adicionado ao carrinho`, style: { background: 'var(--primary)' } }).showToast();
}

function focarCampoCodigoVenda() {
    const input = document.getElementById('venda-codigo-input');
    if (input) {
        input.focus();
        input.select?.();
    }
}

function obterDadosOrcamentoFormulario() {
    return {
        validade: document.getElementById('orc-validade')?.value || '',
        observacao: (document.getElementById('orc-observacao')?.value || '').trim()
    };
}

function adicionarProdutoPorCodigoRapido() {
    const input = document.getElementById('venda-codigo-input');
    const codigo = String(input?.value || '').trim();
    if (!codigo) return alert('Informe ou leia um código para adicionar ao carrinho.');

    const produto = (typeof localizarProdutoPorCodigo === 'function') ? localizarProdutoPorCodigo(codigo) : null;
    if (!produto) return alert('Produto não encontrado para esse código.');

    adicionarProdutoAoCarrinho(produto, 1, 'BALCAO', produto.repasse);
    if (input) input.value = '';
    focarCampoCodigoVenda();
}

function abrirVenda(id, p) {
    vendaPendente = { ...p, id, origem: 'BALCAO' };
    document.getElementById('m-qtd-titulo').innerText = obterNomeProdutoVenda(p);
    document.getElementById('venda-qtd-input').value = 1;
    document.getElementById('modal-qtd').style.display = 'flex';
}

function adicionarItemCarrinhoPendente() {
    if (!vendaPendente) return;
    const qtd = parseInt(document.getElementById('venda-qtd-input').value) || 1;
    adicionarProdutoAoCarrinho(vendaPendente, qtd, vendaPendente.origem || 'BALCAO', vendaPendente.repasse);
    fecharModais();
    focarCampoCodigoVenda();
}

function abrirVendaEco(id) {
    const p = (cacheEstoque || []).find(i => i.id === id);
    if (!p || !p.eco_venda) return alert('Configure preço online');
    vendaPendente = { ...p, id, repasse: p.eco_venda, origem: 'ECO' };
    document.getElementById('m-qtd-titulo').innerText = obterNomeProdutoVenda(p) + ' (WEB)';
    document.getElementById('venda-qtd-input').value = 1;
    document.getElementById('modal-qtd').style.display = 'flex';
}

function abrirModalCliente() {
    if (!carrinhoVenda.length) return alert('Adicione pelo menos um item ao carrinho.');
    fecharModais();
    document.getElementById('modal-cliente').style.display = 'flex';
    mostrarSelecaoCliente();
}

function mostrarSelecaoCliente() {
    const isBoleto = document.getElementById('cli-pgto').value === 'BOLETO';
    document.getElementById('selecao-cliente-boleto').style.display = isBoleto ? 'block' : 'none';
}

function montarPayloadItensCarrinho() {
    return carrinhoVenda.map(item => ({
        id: item.id,
        produtoId: item.produtoId || item.id,
        nome: item.nome,
        marca: item.marca || '',
        nome_peca: item.nome_peca || '',
        codigo: item.codigo || '',
        qtd: parseInt(item.qtd) || 1,
        unitario: parseFloat(item.unitario) || 0,
        total: (parseInt(item.qtd) || 1) * (parseFloat(item.unitario) || 0),
        origem: item.origem || 'BALCAO'
    }));
}

async function criarOuEfetivarVenda(tipo = 'VENDA') {
    if (!carrinhoVenda.length) return null;

    const cliNome = document.getElementById('cli-nome').value || 'Consumidor';
    const pgto = document.getElementById('cli-pgto').value;
    const cliId = document.getElementById('cli-boleto-select').value || '';
    const dadosOrcamento = obterDadosOrcamentoFormulario();
    const itens = montarPayloadItensCarrinho();
    const total = itens.reduce((acc, item) => acc + item.total, 0);
    const quantidadeTotal = itens.reduce((acc, item) => acc + item.qtd, 0);
    const resumo = resumoItensVenda(itens);

    if (tipo === 'ORCAMENTO') {
        const orcamento = {
            numero: gerarNumeroOrcamento(),
            itens,
            peca: resumo,
            produtoId: itens.length === 1 ? itens[0].produtoId : '',
            qtd: quantidadeTotal,
            venda: total,
            unitario: itens.length === 1 ? itens[0].unitario : 0,
            cliente: cliNome,
            clienteId: pgto === 'BOLETO' ? cliId : '',
            pagamento: pgto,
            validade: dadosOrcamento.validade,
            observacao: dadosOrcamento.observacao,
            status: 'ABERTO',
            tipo: 'ORCAMENTO',
            data: new Date().toLocaleDateString('pt-BR'),
            hora: new Date().toLocaleTimeString('pt-BR'),
            timestamp: Date.now(),
            origem: itens.length === 1 ? (itens[0].origem || 'BALCAO') : 'CARRINHO',
            operador: auth.currentUser.email
        };
        await db.collection('vendas_kell').add(orcamento);
        Toastify({ text: 'Orçamento criado com sucesso!', style: { background: 'var(--primary)' } }).showToast();
        fecharModais();
        limparCarrinhoVenda(true);
        return orcamento;
    }

    const res = await db.runTransaction(async t => {
        const seqRef = db.collection('config_kell').doc('sequencial');
        const sDoc = await t.get(seqRef);
        const num = (sDoc.exists ? sDoc.data().ultimoPedido : 0) + 1;

        const leiturasEstoque = [];
        let custo = 0;
        const itensVenda = [];
        for (const item of itens) {
            const ref = db.collection('estoque_kell').doc(item.produtoId);
            const doc = await t.get(ref);
            if (!doc.exists) throw new Error(`Produto não encontrado: ${item.nome}`);
            const estoqueAtual = parseInt(doc.data().qtd) || 0;
            if (estoqueAtual < item.qtd) throw new Error(`Sem estoque para ${item.nome}`);
            const custoItem = item.qtd * (parseFloat(doc.data().compra) || 0);
            custo += custoItem;
            itensVenda.push({ ...item, custo_unitario: parseFloat(doc.data().compra) || 0 });
            leiturasEstoque.push({ ref, estoqueAtual, qtd: item.qtd });
        }

        let clienteFiadoRef = null;
        let clienteFiadoNome = '';
        if (pgto === 'BOLETO') {
            if (!cliId) throw new Error('Selecione um cliente para fiado.');
            clienteFiadoRef = db.collection('clientes_kell').doc(cliId);
            const cDoc = await t.get(clienteFiadoRef);
            if (!cDoc.exists) throw new Error('Cliente do fiado não encontrado.');
            clienteFiadoNome = cDoc.data().nome;
        }

        const lucro = total - custo;
        const venda = {
            numero: num,
            itens: itensVenda,
            peca: resumo,
            produtoId: itensVenda.length === 1 ? itensVenda[0].produtoId : '',
            qtd: quantidadeTotal,
            venda: total,
            unitario: itensVenda.length === 1 ? itensVenda[0].unitario : 0,
            cliente: cliNome,
            clienteId: pgto === 'BOLETO' ? cliId : '',
            pagamento: pgto,
            observacao: dadosOrcamento.observacao,
            data: new Date().toLocaleDateString('pt-BR'),
            hora: new Date().toLocaleTimeString('pt-BR'),
            timestamp: Date.now(),
            origem: itensVenda.length === 1 ? (itensVenda[0].origem || 'BALCAO') : 'CARRINHO',
            operador: auth.currentUser.email,
            financeiro: { custo_prod: custo, lucro_liquido: lucro },
            lucro,
            pagamento_efetivado: true
        };

        if (pgto === 'BOLETO') {
            venda.cliente = clienteFiadoNome;
            venda.pagamento_efetivado = false;
        }

        leiturasEstoque.forEach(item => {
            t.update(item.ref, { qtd: item.estoqueAtual - item.qtd });
        });

        if (clienteFiadoRef) {
            t.update(clienteFiadoRef, { debito: firebase.firestore.FieldValue.increment(total) });
        }

        t.set(seqRef, { ultimoPedido: num }, { merge: true });
        t.set(db.collection('vendas_kell').doc(), venda);
        return venda;
    });

    fecharModais();
    gerarCupom(res);
    Toastify({ text: 'Venda OK!', style: { background: 'green' } }).showToast();
    limparCarrinhoVenda(true);
    return res;
}

async function confirmarVenda() {
    try {
        await criarOuEfetivarVenda('VENDA');
    } catch (e) {
        alert(e.message || e);
    }
}

async function criarOrcamento() {
    try {
        await criarOuEfetivarVenda('ORCAMENTO');
    } catch (e) {
        alert(e.message || e);
    }
}

async function converterOrcamentoEmVenda(id) {
    const orcamento = (cacheVendas || []).find(item => item.id === id && item.tipo === 'ORCAMENTO');
    if (!orcamento) return alert('Orçamento não encontrado.');
    if (orcamento.status === 'VENDIDO') return alert('Esse orçamento já foi convertido em venda.');

    const itens = normalizarItensDocumento(orcamento);

    try {
        await db.runTransaction(async t => {
            const seqRef = db.collection('config_kell').doc('sequencial');
            const sDoc = await t.get(seqRef);
            const num = (sDoc.exists ? sDoc.data().ultimoPedido : 0) + 1;

            const leiturasEstoque = [];
            let custo = 0;
            for (const item of itens) {
                const refProduto = db.collection('estoque_kell').doc(item.produtoId);
                const produtoDoc = await t.get(refProduto);
                if (!produtoDoc.exists) throw new Error(`Produto não encontrado: ${item.nome}`);
                const estoqueAtual = parseInt(produtoDoc.data().qtd) || 0;
                if (estoqueAtual < item.qtd) throw new Error(`Sem estoque para ${item.nome}`);
                custo += item.qtd * (parseFloat(produtoDoc.data().compra) || 0);
                leiturasEstoque.push({ refProduto, estoqueAtual, qtd: item.qtd });
            }

            const total = itens.reduce((acc, item) => acc + item.total, 0);
            const quantidadeTotal = itens.reduce((acc, item) => acc + item.qtd, 0);
            const lucro = total - custo;
            const venda = {
                numero: num,
                itens,
                peca: resumoItensVenda(itens),
                produtoId: itens.length === 1 ? itens[0].produtoId : '',
                qtd: quantidadeTotal,
                venda: total,
                unitario: itens.length === 1 ? itens[0].unitario : 0,
                cliente: orcamento.cliente,
                clienteId: orcamento.clienteId || '',
                pagamento: orcamento.pagamento,
                observacao: orcamento.observacao || '',
                data: new Date().toLocaleDateString('pt-BR'),
                hora: new Date().toLocaleTimeString('pt-BR'),
                timestamp: Date.now(),
                origem: 'ORCAMENTO',
                operador: auth.currentUser.email,
                financeiro: { custo_prod: custo, lucro_liquido: lucro },
                lucro,
                pagamento_efetivado: orcamento.pagamento !== 'BOLETO'
            };

            let clienteFiadoRef = null;
            let clienteFiadoNome = '';
            if (orcamento.pagamento === 'BOLETO') {
                if (!orcamento.clienteId) throw new Error('Esse orçamento fiado precisa de um cliente vinculado.');
                clienteFiadoRef = db.collection('clientes_kell').doc(orcamento.clienteId);
                const cDoc = await t.get(clienteFiadoRef);
                if (!cDoc.exists) throw new Error('Cliente do fiado não encontrado.');
                clienteFiadoNome = cDoc.data().nome;
            }

            if (clienteFiadoNome) {
                venda.cliente = clienteFiadoNome;
            }

            leiturasEstoque.forEach(item => {
                t.update(item.refProduto, { qtd: item.estoqueAtual - item.qtd });
            });

            if (clienteFiadoRef) {
                t.update(clienteFiadoRef, { debito: firebase.firestore.FieldValue.increment(total) });
            }

            t.set(seqRef, { ultimoPedido: num }, { merge: true });
            t.set(db.collection('vendas_kell').doc(), venda);
            t.update(db.collection('vendas_kell').doc(id), { status: 'VENDIDO', venda_numero: num, convertido_em: Date.now() });
        });
        Toastify({ text: 'Orçamento convertido em venda!', style: { background: 'green' } }).showToast();
    } catch (e) {
        alert(e.message || e);
    }
}

function abrirOrcamentoParaEdicao(id) {
    const orcamento = (cacheVendas || []).find(item => item.id === id && item.tipo === 'ORCAMENTO');
    if (!orcamento) return;
    carrinhoVenda = normalizarItensDocumento(orcamento);
    renderizarCarrinhoVenda();
    document.getElementById('cli-nome').value = orcamento.cliente || '';
    document.getElementById('cli-pgto').value = orcamento.pagamento || 'DINHEIRO';
    document.getElementById('cli-boleto-select').value = orcamento.clienteId || '';
    const validade = document.getElementById('orc-validade');
    const observacao = document.getElementById('orc-observacao');
    if (validade) validade.value = orcamento.validade || '';
    if (observacao) observacao.value = orcamento.observacao || '';
    mostrarSelecaoCliente();
    document.getElementById('modal-cliente').style.display = 'flex';
}

function duplicarOrcamento(id) {
    const orcamento = (cacheVendas || []).find(item => item.id === id && item.tipo === 'ORCAMENTO');
    if (!orcamento) return alert('Orçamento não encontrado.');

    carrinhoVenda = normalizarItensDocumento(orcamento);
    renderizarCarrinhoVenda();
    document.getElementById('cli-nome').value = orcamento.cliente || '';
    document.getElementById('cli-pgto').value = orcamento.pagamento || 'DINHEIRO';
    document.getElementById('cli-boleto-select').value = orcamento.clienteId || '';
    const validade = document.getElementById('orc-validade');
    const observacao = document.getElementById('orc-observacao');
    if (validade) validade.value = orcamento.validade || '';
    if (observacao) observacao.value = orcamento.observacao || '';
    mostrarSelecaoCliente();
    document.getElementById('modal-cliente').style.display = 'flex';
    Toastify({ text: 'Orçamento carregado para duplicação.', style: { background: 'var(--primary)' } }).showToast();
}

function imprimirOrcamento(id) {
    const orcamento = (cacheVendas || []).find(item => item.id === id && item.tipo === 'ORCAMENTO');
    if (!orcamento) return alert('Orçamento não encontrado.');

    const itens = normalizarItensDocumento(orcamento);
    const htmlItens = itens.map(item => `
        <tr>
            <td style="padding:8px 0; border-bottom:1px solid #ddd;">${item.nome}</td>
            <td style="padding:8px 0; border-bottom:1px solid #ddd; text-align:center;">${item.qtd}</td>
            <td style="padding:8px 0; border-bottom:1px solid #ddd; text-align:right;">R$ ${parseFloat(item.total || 0).toFixed(2)}</td>
        </tr>
    `).join('');

    const janela = window.open('', '_blank', 'width=900,height=700');
    if (!janela) return alert('Não foi possível abrir a janela de impressão.');

    janela.document.write(`<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Orçamento ${orcamento.numero || ''}</title><style>body{font-family:Arial,sans-serif;background:#fff;color:#111;margin:0;padding:32px}h1,h2,p{margin:0}table{width:100%;border-collapse:collapse;margin-top:18px}.box{border:1px solid #ddd;border-radius:12px;padding:18px;margin-bottom:18px}.muted{color:#666;font-size:13px}.total{font-size:24px;font-weight:800;text-align:right;margin-top:18px}.footer{margin-top:22px;font-size:13px;color:#444;white-space:pre-wrap}</style></head><body><div class="box"><h1>${configEmpresa.nome || 'KELL MOTOS'}</h1><p class="muted">${configEmpresa.endereco || ''}</p><p class="muted">Telefone: ${configEmpresa.telefone || ''}</p></div><div class="box"><h2>Orçamento ${orcamento.numero || ''}</h2><p class="muted">Cliente: ${orcamento.cliente || 'Consumidor'}</p><p class="muted">Data: ${orcamento.data || ''} ${orcamento.hora || ''}</p><p class="muted">Validade: ${orcamento.validade || 'Não informada'}</p></div><table><thead><tr><th style="text-align:left;">Produto</th><th>Qtd</th><th style="text-align:right;">Total</th></tr></thead><tbody>${htmlItens}</tbody></table><div class="total">Total: R$ ${parseFloat(orcamento.venda || 0).toFixed(2)}</div><div class="footer">${orcamento.observacao ? `Observação: ${orcamento.observacao}` : ''}</div><script>window.onload=function(){setTimeout(function(){window.print();},150);};<\/script></body></html>`);
    janela.document.close();
}

async function excluirOrcamento(id) {
    if (typeof userNivel === 'undefined' || userNivel !== 'SENIOR') {
        return alert('Somente usuários SENIOR podem excluir orçamentos.');
    }

    const orcamento = (cacheVendas || []).find(item => item.id === id && item.tipo === 'ORCAMENTO');
    if (!orcamento) return alert('Orçamento não encontrado.');

    const confirmado = confirm(`Excluir o orçamento ${orcamento.numero || ''} de ${orcamento.cliente || 'Consumidor'}?`);
    if (!confirmado) return;

    try {
        await db.collection('vendas_kell').doc(id).delete();
        Toastify({ text: 'Orçamento excluído com sucesso!', style: { background: 'var(--primary)' } }).showToast();
    } catch (e) {
        alert(e.message || e);
    }
}

function renderizarVendas() {
    const tbody = document.getElementById('corpo-vendas');
    if (!tbody) return;

    const lista = (typeof cacheVendas !== 'undefined' ? cacheVendas : []).filter(v => v.tipo !== 'ORCAMENTO').slice(0, 50);
    tbody.innerHTML = lista.map(v => {
        const numero = v.numero || '---';
        const cliente = v.cliente || 'Consumidor';
        const peca = v.peca || resumoItensVenda(normalizarItensDocumento(v));
        const valor = parseFloat(v.venda || 0).toFixed(2);
        const vendaSafe = JSON.stringify(v).replace(/"/g, '&quot;');
        return `<tr>
            <td><b style="color:var(--primary)">#${numero}</b></td>
            <td>${cliente}</td>
            <td>${peca}</td>
            <td>R$ ${valor}</td>
            <td style="text-align:right"><button class="btn btn-sm btn-secondary" onclick='gerarCupom(${vendaSafe})'><i class="ri-printer-line"></i></button></td>
        </tr>`;
    }).join('');
}

function renderizarOrcamentos() {
    const tbody = document.getElementById('corpo-orcamentos');
    if (!tbody) return;

    const lista = (typeof cacheVendas !== 'undefined' ? cacheVendas : []).filter(v => v.tipo === 'ORCAMENTO').slice(0, 50);
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:18px; color:var(--text-muted);">Nenhum orçamento cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(o => {
        const valor = parseFloat(o.venda || 0).toFixed(2);
        const status = o.status || 'ABERTO';
        const badgeColor = status === 'VENDIDO' ? 'bg-green' : 'bg-yellow';
        const resumo = o.peca || resumoItensVenda(normalizarItensDocumento(o));
        const validade = o.validade ? `Validade: ${o.validade.split('-').reverse().join('/')}` : 'Sem validade';
        return `<tr>
            <td><b style="color:var(--primary)">${o.numero || '---'}</b></td>
            <td>${o.cliente || 'Consumidor'}</td>
            <td><div>${resumo}</div><div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${validade}</div></td>
            <td>R$ ${valor}</td>
            <td><span class="status-badge ${badgeColor}">${status}</span></td>
            <td style="text-align:right; display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
                ${status !== 'VENDIDO' ? `<button class="btn btn-sm btn-primary" onclick="converterOrcamentoEmVenda('${o.id}')">Virar venda</button>` : ''}
                <button class="btn btn-sm btn-secondary" onclick="imprimirOrcamento('${o.id}')"><i class="ri-printer-line"></i></button>
                <button class="btn btn-sm btn-secondary" onclick="duplicarOrcamento('${o.id}')"><i class="ri-file-copy-line"></i></button>
                <button class="btn btn-sm btn-secondary" onclick="abrirOrcamentoParaEdicao('${o.id}')">Abrir</button>
                ${typeof userNivel !== 'undefined' && userNivel === 'SENIOR' ? `<button class="btn btn-sm btn-danger" onclick="excluirOrcamento('${o.id}')"><i class="ri-delete-bin-line"></i></button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

function gerarCupom(v) {
    const itens = normalizarItensDocumento(v);
    document.getElementById('cp-empresa-nome').innerText = configEmpresa.nome;
    document.getElementById('cp-empresa-end').innerText = configEmpresa.endereco || '';
    document.getElementById('cp-empresa-cnpj').innerText = configEmpresa.cnpj;
    document.getElementById('cp-empresa-tel').innerText = configEmpresa.telefone || '';
    document.getElementById('cp-num').innerText = '#' + v.numero;
    document.getElementById('cp-data').innerText = v.data + ' ' + v.hora;
    document.getElementById('cp-cli').innerText = String(v.cliente || '').slice(0, 30);
    document.getElementById('cp-itens').innerHTML = itens.map(item => `<tr><td style="padding:2px 0;">${String(item.nome || '').slice(0, 25)}</td><td align="center">${item.qtd}</td><td align="right">${parseFloat(item.total || 0).toFixed(2)}</td></tr>`).join('');
    document.getElementById('cp-total').innerText = 'R$ ' + parseFloat(v.venda || 0).toFixed(2);
    document.getElementById('cp-pgto').innerText = v.pagamento;
    document.getElementById('cp-operador').innerText = (v.operador || 'sis').split('@')[0];
    document.getElementById('qrcode-venda').innerHTML = '';
    new QRCode(document.getElementById('qrcode-venda'), { text: 'PED-' + v.numero, width: 80, height: 80 });
    const wrapper = document.getElementById('cupom-wrapper');
    const element = document.getElementById('cupom-print');
    wrapper.style.display = 'flex';
    setTimeout(() => {
        const contentHeight = element.offsetHeight;
        const heightInMm = (contentHeight * 0.264583) + 10;
        const opt = { margin: 0, filename: `Recibo_${v.numero}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 3, useCORS: true, scrollY: 0 }, jsPDF: { unit: 'mm', format: [80, heightInMm] } };
        html2pdf().from(element).set(opt).save().then(() => wrapper.style.display = 'none');
    }, 500);
}

function renderizarEcommerce() {
    const grid = document.getElementById('ecommerce-grid');
    if (!grid) return;

    const estoque = Array.isArray(cacheEstoque) ? cacheEstoque : [];
    const busca = (document.getElementById('ecommerce-busca')?.value || '').trim().toLowerCase();
    const filtro = document.getElementById('ecommerce-status')?.value || 'todos';
    if (window.__ultimaBuscaEcommerce !== busca || window.__ultimoFiltroEcommerce !== filtro) {
        window.__paginaEcommerceAtual = 1;
        window.__ultimaBuscaEcommerce = busca;
        window.__ultimoFiltroEcommerce = filtro;
    }

    const enriquecido = estoque.map(produto => {
        const custoBase = (parseFloat(produto.compra) || 0) + (parseFloat(produto.taxa_envio) || 0);
        const precoBalcao = parseFloat(produto.repasse) || 0;
        const precoOnline = parseFloat(produto.eco_venda) || 0;
        const imagens = Array.isArray(produto.imagens) ? produto.imagens.filter(Boolean) : [];
        const imagemPrincipal = produto.imagem || imagens[0] || '';
        const estoqueAtual = parseFloat(produto.qtd) || 0;
        const nome = obterNomeProdutoVenda(produto);
        const compatibilidade = (produto.compatibilidade || []).join(' ');
        const prontoParaEcommerce = Boolean(precoOnline > 0 && imagemPrincipal);
        const margemOnline = precoOnline > 0 && custoBase > 0 ? ((precoOnline - custoBase) / precoOnline) * 100 : 0;

        return {
            ...produto,
            custoBase,
            precoBalcao,
            precoOnline,
            imagemPrincipal,
            estoqueAtual,
            nome,
            compatibilidade,
            prontoParaEcommerce,
            margemOnline
        };
    });

    const filtrado = enriquecido.filter(produto => {
        const textoBusca = [produto.nome, produto.marca, produto.nome_peca, produto.codigo, produto.compatibilidade]
            .join(' ')
            .toLowerCase();

        const bateBusca = !busca || textoBusca.includes(busca);
        if (!bateBusca) return false;

        if (filtro === 'prontos') return produto.prontoParaEcommerce;
        if (filtro === 'sem_preco') return !produto.precoOnline;
        if (filtro === 'sem_foto') return !produto.imagemPrincipal;
        if (filtro === 'baixo_estoque') return produto.estoqueAtual > 0 && produto.estoqueAtual <= 3;
        return true;
    });

    atualizarResumoEcommerce(enriquecido);

    window.__ecommerceTotalItens = filtrado.length;
    const limite = 4;
    const totalPaginas = Math.max(1, Math.ceil(filtrado.length / limite));
    window.__paginaEcommerceAtual = Math.min(window.__paginaEcommerceAtual || 1, totalPaginas);
    const inicio = ((window.__paginaEcommerceAtual || 1) - 1) * limite;
    const paginaAtual = filtrado.slice(inicio, inicio + limite);

    if (!filtrado.length) {
        grid.innerHTML = `<div class="ecommerce-empty-state">Nenhum produto encontrado com esse filtro. Ajuste a busca ou escolha outro status.</div>`;
        atualizarPaginacaoEcommerce(0, 1);
        return;
    }

    grid.innerHTML = paginaAtual.map(renderizarCardEcommerce).join('');
    atualizarPaginacaoEcommerce(filtrado.length, totalPaginas);
}

function abrirAjusteEco(id) {
    itemEcoPendente = cacheEstoque.find(i => i.id === id);
    if (!itemEcoPendente) return;
    document.getElementById('label-peca-eco').innerText = obterNomeProdutoVenda(itemEcoPendente);
    document.getElementById('card-calc-eco').style.display = 'block';
    executarCalculoOnline();
    document.getElementById('card-calc-eco').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function executarCalculoOnline() {
    if (!itemEcoPendente) return;
    const b = (parseFloat(itemEcoPendente.compra) || 0) + (parseFloat(itemEcoPendente.taxa_envio) || 0);
    const e = parseFloat(document.getElementById('calc_emb').value) || 0;
    const tx = parseFloat(document.getElementById('calc_taxa_site').value) || 0;
    const fix = parseFloat(document.getElementById('calc_taxa_fixa').value) || 0;
    const fr = parseFloat(document.getElementById('calc_frete').value) || 0;
    const br = parseFloat(document.getElementById('calc_brinde').value) || 0;
    const m = parseFloat(document.getElementById('calc_margem_alvo').value) || 0;
    const sug = (b + e + fr + br + fix + (b * tx / 100)) * (1 + m / 100);
    const lucroEstimado = sug - (b + e + fr + br + fix + (b * tx / 100));
    document.getElementById('eco-calc-custo-base').innerText = formatarMoedaEco(b);
    document.getElementById('eco-calc-preco-balcao').innerText = formatarMoedaEco(parseFloat(itemEcoPendente.repasse) || 0);
    const calcVendaEl = document.getElementById('calc_venda');
    calcVendaEl.innerText = formatarMoedaEco(sug);
    calcVendaEl.dataset.valorCalculado = String(sug);
    document.getElementById('eco-calc-resumo').innerText = `Lucro estimado de ${formatarMoedaEco(lucroEstimado)} com margem alvo de ${m.toFixed(1)}%.`;
}

async function salvarPrecoOnline() {
    if (!itemEcoPendente) return;
    const v = parseFloat(document.getElementById('calc_venda').dataset.valorCalculado || '0') || 0;
    await db.collection('estoque_kell').doc(itemEcoPendente.id).update({ eco_venda: v });
    document.getElementById('card-calc-eco').style.display = 'none';
    Toastify({ text: 'Atualizado' }).showToast();
}

function formatarMoedaEco(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escaparHtmlEco(texto) {
    return String(texto || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderizarCardEcommerce(produto) {
    const subtitulo = produto.compatibilidade || 'Sem aplicação informada para o canal online.';
    const badges = [];

    if (produto.prontoParaEcommerce) {
        badges.push('<span class="ecommerce-badge ready">Pronto para vender</span>');
    } else {
        if (!produto.precoOnline) badges.push('<span class="ecommerce-badge warning">Sem preço online</span>');
        if (!produto.imagemPrincipal) badges.push('<span class="ecommerce-badge warning">Sem foto</span>');
    }

    if (produto.estoqueAtual > 0 && produto.estoqueAtual <= 3) {
        badges.push('<span class="ecommerce-badge info">Baixo estoque</span>');
    }

    const imagem = produto.imagemPrincipal
        ? `<img src="${escaparHtmlEco(produto.imagemPrincipal)}" alt="${escaparHtmlEco(produto.nome)}">`
        : `<i class="ri-image-add-line" style="font-size:42px; color:var(--text-muted);"></i>`;

    return `
        <div class="card ecommerce-card">
            <div class="ecommerce-card-media" onclick="abrirModalProdutoDetalhesPorId('${produto.id}')" style="cursor:pointer;">
                ${imagem}
            </div>
            <div class="ecommerce-card-badges">${badges.join(' ')}</div>
            <div class="ecommerce-card-brand">${escaparHtmlEco(produto.marca || 'Marca não informada')}</div>
            <div class="ecommerce-card-title">${escaparHtmlEco(produto.nome)}</div>
            <div class="ecommerce-card-subtitle">${escaparHtmlEco(subtitulo)}</div>
            <div class="ecommerce-card-price-row">
                <div class="ecommerce-card-price">
                    <span>Preço balcão</span>
                    <strong>${formatarMoedaEco(produto.precoBalcao)}</strong>
                </div>
                <div class="ecommerce-card-price">
                    <span>Preço online</span>
                    <strong>${produto.precoOnline ? formatarMoedaEco(produto.precoOnline) : '--'}</strong>
                </div>
            </div>
            <div class="ecommerce-card-price-row">
                <div class="ecommerce-card-price">
                    <span>Custo base</span>
                    <strong>${formatarMoedaEco(produto.custoBase)}</strong>
                </div>
                <div class="ecommerce-card-price">
                    <span>Estoque</span>
                    <strong>${produto.estoqueAtual}</strong>
                </div>
            </div>
            <div class="ecommerce-card-footer">
                <button class="btn btn-sm btn-secondary" onclick="abrirModalProdutoDetalhesPorId('${produto.id}')">Detalhes</button>
                <button class="btn btn-sm btn-secondary" onclick="abrirAjusteEco('${produto.id}')">Precificar</button>
                <button class="btn btn-sm btn-primary" onclick="abrirVendaEco('${produto.id}')">Venda online</button>
            </div>
        </div>
    `;
}

function atualizarResumoEcommerce(produtos) {
    const total = produtos.length;
    const prontos = produtos.filter(produto => produto.prontoParaEcommerce).length;
    const semPreco = produtos.filter(produto => !produto.precoOnline).length;
    const semFoto = produtos.filter(produto => !produto.imagemPrincipal).length;
    const totalOnline = produtos.filter(produto => produto.precoOnline).length;
    const ticketMedio = totalOnline ? produtos.filter(produto => produto.precoOnline).reduce((acc, produto) => acc + produto.precoOnline, 0) / totalOnline : 0;
    const potencial = produtos
        .filter(produto => produto.prontoParaEcommerce)
        .reduce((acc, produto) => acc + (produto.precoOnline * produto.estoqueAtual), 0);
    const percentualFoto = total ? Math.round(((total - semFoto) / total) * 100) : 0;

    const prioridade = semPreco >= semFoto
        ? 'Precificar itens sem valor publicado'
        : 'Completar fotos dos produtos com mais saída';

    atualizarTextoElemento('eco-total-online', String(totalOnline));
    atualizarTextoElemento('eco-total-online-meta', `${prontos} itens já têm foto e preço para anunciar`);
    atualizarTextoElemento('eco-ticket-medio', formatarMoedaEco(ticketMedio));
    atualizarTextoElemento('eco-ticket-meta', totalOnline ? 'Média dos preços online configurados' : 'Cadastre preços online para medir o ticket');
    atualizarTextoElemento('eco-kpi-prontos', String(prontos));
    atualizarTextoElemento('eco-kpi-prontos-meta', total ? `${Math.round((prontos / total) * 100)}% do catálogo pronto` : 'Sem produtos cadastrados');
    atualizarTextoElemento('eco-kpi-sem-preco', String(semPreco));
    atualizarTextoElemento('eco-kpi-sem-preco-meta', semPreco ? 'Itens pedindo precificação digital' : 'Todos os itens têm preço online');
    atualizarTextoElemento('eco-kpi-sem-foto', String(semFoto));
    atualizarTextoElemento('eco-kpi-sem-foto-meta', semFoto ? 'Fotos faltando para conversão melhor' : 'Catálogo 100% ilustrado');
    atualizarTextoElemento('eco-kpi-potencial', formatarMoedaEco(potencial));
    atualizarTextoElemento('eco-kpi-potencial-meta', prontos ? 'Valor total possível no estoque pronto' : 'Precifique e fotografe para liberar o potencial');
    atualizarTextoElemento('eco-checklist-prioridade', prioridade);
    atualizarTextoElemento('eco-checklist-foto', `${percentualFoto}%`);
    atualizarTextoElemento('eco-checklist-publicaveis', `${prontos}/${total}`);
}

function atualizarTextoElemento(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.innerText = valor;
}

function atualizarPaginacaoEcommerce(totalItens, totalPaginas) {
    const container = document.getElementById('ecommerce-paginacao');
    const info = document.getElementById('ecommerce-paginacao-info');
    if (!container || !info) return;
    const paginaAtual = window.__paginaEcommerceAtual || 1;
    container.style.display = totalItens > 4 ? 'flex' : 'none';
    info.innerText = `Página ${paginaAtual} de ${Math.max(1, totalPaginas || 1)}`;
}

function mudarPaginaEcommerce(direcao) {
    const totalItens = window.__ecommerceTotalItens || 0;
    const totalPaginas = Math.max(1, Math.ceil(totalItens / 4));
    const paginaAtual = window.__paginaEcommerceAtual || 1;
    const proximaPagina = paginaAtual + direcao;
    if (proximaPagina < 1 || proximaPagina > totalPaginas) return;
    window.__paginaEcommerceAtual = proximaPagina;
    renderizarEcommerce();
}

document.addEventListener('DOMContentLoaded', () => {
    renderizarCarrinhoVenda();
    const inputVenda = document.getElementById('venda-codigo-input');
    if (inputVenda && !inputVenda.dataset.bindedEnter) {
        inputVenda.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                venderPorCodigoManual();
            }
        });
        inputVenda.dataset.bindedEnter = 'true';
    }
    focarCampoCodigoVenda();
});
