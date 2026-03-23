import React, { useState, useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, ArcElement, Tooltip, Legend, 
  CategoryScale, LinearScale, BarElement, Title 
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css';
import Login from './Login';
import logoUber from './assets/uber.png'; 
import logo99 from './assets/99.png'; 
import logoShopee from './assets/shopee.png';
import logoMercadoLivre from './assets/mercadolivre.png';
import logoIfood from './assets/ifood.png'; 

// --- IMPORTAÇÕES DO FIREBASE ---
import { db, auth } from './firebase'; 
import { 
  collection, addDoc, onSnapshot, query, 
  orderBy, deleteDoc, doc, updateDoc, where 
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function App() {
  // --- ESTADOS ---
  const [transacoes, setTransacoes] = useState([]); // Começa vazio, vem do banco
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('ganho');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7));
  const [plataforma, setPlataforma] = useState('Uber'); 
  const [veiculo, setVeiculo] = useState('carro');
  const [km, setKm] = useState('');
  const [kml, setKml] = useState('');
  const [precoLitro, setPrecoLitro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const formularioRef = useRef(null);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // --- LISTENER DE AUTENTICAÇÃO ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioAtual(user);
      setCarregando(false);
    });

    return () => unsubscribe();
  }, []);

  // --- BUSCAR DADOS DO FIREBASE (TEMPO REAL) ---
  useEffect(() => {
    if (!usuarioAtual) {
      setTransacoes([]);
      return;
    }

    // Busca na coleção 'transacoes' apenas do usuário atual
    const q = query(
      collection(db, "transacoes"),
      where("userId", "==", usuarioAtual.uid),
      orderBy("data", "desc")
    );
    
    // O onSnapshot atualiza o app sozinho se algo mudar no banco
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransacoes(dados);
    });

    return () => unsubscribe();
  }, [usuarioAtual]);

  // --- CÁLCULOS (FILTROS) ---
  const transacoesFiltradas = transacoes.filter(t => t.data.startsWith(mesFiltro));
  const totalGanhos = transacoesFiltradas.filter(t => t.tipo === 'ganho').reduce((acc, t) => acc + t.valor, 0);
  const totalGastos = transacoesFiltradas.filter(t => t.tipo === 'gasto').reduce((acc, t) => acc + t.valor, 0);
  const saldoFinal = totalGanhos - totalGastos;
  const totalKmMes = transacoesFiltradas.reduce((acc, t) => acc + (t.distanciaPercorrida || 0), 0);
  
  // --- NOVAS ESTATÍSTICAS ---
  const ganhosPorUber = transacoesFiltradas.filter(t => t.tipo === 'ganho' && t.descricao.startsWith('Uber')).reduce((acc, t) => acc + t.valor, 0);
  const ganhosPor99 = transacoesFiltradas.filter(t => t.tipo === 'ganho' && t.descricao.startsWith('99')).reduce((acc, t) => acc + t.valor, 0);
  const ganhosPorShopee = transacoesFiltradas.filter(t => t.tipo === 'ganho' && t.descricao.startsWith('Shopee')).reduce((acc, t) => acc + t.valor, 0);
  const ganhosPorMercadoLivre = transacoesFiltradas.filter(t => t.tipo === 'ganho' && t.descricao.startsWith('Mercado Livre')).reduce((acc, t) => acc + t.valor, 0);
  const ganhosPorIfood = transacoesFiltradas.filter(t => t.tipo === 'ganho' && t.descricao.startsWith('iFood')).reduce((acc, t) => acc + t.valor, 0);
  const gastoCombustivel = transacoesFiltradas.filter(t => t.descricao && t.descricao.includes('Combustível')).reduce((acc, t) => acc + t.valor, 0);
  const diasComDados = new Set(transacoesFiltradas.map(t => t.data)).size;
  const mediaGanhosPorDia = diasComDados > 0 ? totalGanhos / diasComDados : 0;
  const lucroLiquidoPorKm = totalKmMes > 0 ? saldoFinal / totalKmMes : 0;
  const eficienciaLucro = totalGanhos > 0 ? (saldoFinal / totalGanhos) * 100 : 0;

  // --- ADICIONAR NO FIREBASE ---
  const adicionarTransacao = async (e) => {
    e.preventDefault();
    if (!descricao || !valor || !veiculo) return alert("Preencha todos os campos obrigatórios!");

    const descricaoFinal = tipo === 'ganho' ? `${plataforma}: ${descricao}` : descricao;

    try {
      if (editandoId) {
        // Modo edição - atualizar
        await updateDoc(doc(db, "transacoes", editandoId), {
          descricao: descricaoFinal,
          valor: parseFloat(valor),
          tipo,
          data,
          veiculo,
          distanciaPercorrida: (descricao.includes("Combustível") && km) ? parseFloat(km) : 0,
          atualizadoEm: new Date()
        });
        setEditandoId(null);
        alert("Lançamento atualizado com sucesso!");
      } else {
        // Modo novo registro
        await addDoc(collection(db, "transacoes"), {
          descricao: descricaoFinal,
          valor: parseFloat(valor),
          tipo,
          data,
          veiculo,
          userId: usuarioAtual.uid,
          distanciaPercorrida: (descricao.includes("Combustível") && km) ? parseFloat(km) : 0,
          criadoEm: new Date()
        });
      }
      
      // Limpar campos
      setDescricao(''); setValor(''); setKm(''); setKml(''); setPrecoLitro(''); setVeiculo('carro'); setPlataforma('Uber');
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  // --- EDITAR TRANSAÇÃO ---
  const editarTransacao = (transacao) => {
    setEditandoId(transacao.id);
    setData(transacao.data);
    setValor(transacao.valor.toString());
    setTipo(transacao.tipo);
    setVeiculo(transacao.veiculo || 'carro');
    
    if (transacao.tipo === 'ganho') {
      const partes = transacao.descricao.split(': ');
      setPlataforma(partes[0]);
      setDescricao(partes[1] || '');
    } else {
      setDescricao(transacao.descricao);
    }
    
    // Scroll para o formulário
    setTimeout(() => {
      if (formularioRef.current) {
        formularioRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  // --- CANCELAR EDIÇÃO ---
  const cancelarEdicao = () => {
    setEditandoId(null);
    setDescricao(''); setValor(''); setKm(''); setKml(''); setPrecoLitro(''); setVeiculo('carro'); setPlataforma('Uber');
    setData(new Date().toISOString().split('T')[0]);
  };

  // --- LOGOUT ---
  const fazerLogout = async () => {
    if (window.confirm('Deseja sair da conta?')) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Erro ao fazer logout:', err);
      }
    }
  };

  // --- TELA DE CARREGAMENTO ---
  if (carregando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  // --- MOSTRAR LOGIN SE NÃO AUTENTICADO ---
  if (!usuarioAtual) {
    return <Login onLoginSuccess={(user) => setUsuarioAtual(user)} />;
  }

  // --- REMOVER DO FIREBASE ---
  const removerTransacao = async (id) => {
    if(window.confirm("Deseja apagar este registro?")) {
      await deleteDoc(doc(db, "transacoes", id));
    }
  };

  // --- FUNÇÕES DE APOIO (PDF E CÁLCULOS) ---
  const exportarPDF = () => {
    const docPdf = new jsPDF();
    const pageWidth = docPdf.internal.pageSize.getWidth();
    const pageHeight = docPdf.internal.pageSize.getHeight();
    let yPosition = 15;
    
    // Cabeçalho
    docPdf.setFontSize(18);
    docPdf.setFont(undefined, 'bold');
    docPdf.text('RELATÓRIO MOTORISTA PRO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
    
    docPdf.setFontSize(12);
    docPdf.setFont(undefined, 'normal');
    docPdf.text(`Período: ${mesFiltro}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Resumo Financeiro
    docPdf.setFontSize(11);
    docPdf.setFont(undefined, 'bold');
    docPdf.text('RESUMO FINANCEIRO', 14, yPosition);
    yPosition += 7;
    
    docPdf.setFontSize(10);
    docPdf.setFont(undefined, 'normal');
    const resumoData = [
      [`Total de Ganhos:`, `R$ ${totalGanhos.toFixed(2)}`],
      [`Total de Gastos:`, `R$ ${totalGastos.toFixed(2)}`],
      [`Saldo Líquido:`, `R$ ${saldoFinal.toFixed(2)}`],
      [`KM Rodados:`, `${totalKmMes.toFixed(1)} km`],
      [`Média Diária:`, `R$ ${mediaGanhosPorDia.toFixed(2)}`],
      [`Lucro por KM:`, `R$ ${lucroLiquidoPorKm.toFixed(2)}`],
      [`Eficiência:`, `${eficienciaLucro.toFixed(1)}%`]
    ];
    
    docPdf.setDrawColor(59, 130, 246);
    docPdf.setLineWidth(0.5);
    
    resumoData.forEach((item, index) => {
      docPdf.text(item[0], 14, yPosition);
      docPdf.text(item[1], 120, yPosition);
      yPosition += 6;
      if (index === 2) yPosition += 2; // Espaço após saldo
    });
    
    yPosition += 5;
    
    // Comparativo Plataformas (se houver ganhos)
    if (totalGanhos > 0) {
      docPdf.setFont(undefined, 'bold');
      docPdf.text('GANHOS POR PLATAFORMA', 14, yPosition);
      yPosition += 7;
      
      docPdf.setFont(undefined, 'normal');
      const plataformas = [
        ['Uber', ganhosPorUber],
        ['99', ganhosPor99],
        ['Shopee', ganhosPorShopee],
        ['Mercado Livre', ganhosPorMercadoLivre],
        ['iFood', ganhosPorIfood]
      ].filter(p => p[1] > 0);
      
      plataformas.forEach(plat => {
        const percentual = ((plat[1] / totalGanhos) * 100).toFixed(1);
        docPdf.text(`${plat[0]}: R$ ${plat[1].toFixed(2)} (${percentual}%)`, 14, yPosition);
        yPosition += 6;
      });
    }
    
    yPosition += 5;
    docPdf.setDrawColor(0);
    docPdf.setLineWidth(0.3);
    docPdf.line(14, yPosition, pageWidth - 14, yPosition);
    yPosition += 8;
    
    // Tabela de lançamentos
    docPdf.setFont(undefined, 'bold');
    docPdf.text('LANÇAMENTOS', 14, yPosition);
    yPosition += 8;
    
    const tableBody = transacoesFiltradas.map(t => [
      t.data.split('-').reverse().join('/'),
      t.descricao.length > 35 ? t.descricao.substring(0, 35) + '...' : t.descricao,
      t.tipo === 'ganho' ? 'GANHO' : 'GASTO',
      t.veiculo ? (t.veiculo === 'carro' ? 'Carro' : 'Moto') : '-',
      `R$ ${t.valor.toFixed(2)}`
    ]);
    
    autoTable(docPdf, {
      startY: yPosition,
      head: [['Data', 'Descrição', 'Tipo', 'Veículo', 'Valor']],
      body: tableBody,
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      bodyStyles: { textColor: [0, 0, 0] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        4: { halign: 'right' }
      }
    });
    
    docPdf.save(`Relatorio_${mesFiltro}.pdf`);
  };

  const calcularGastoCombustivel = () => {
    if (km && kml && precoLitro) {
      const resultado = (parseFloat(km) / parseFloat(kml)) * parseFloat(precoLitro);
      setValor(resultado.toFixed(2));
      setTipo('gasto');
      setDescricao(`Combustível - ${km} km`);
    }
  };

  const dadosPorDia = transacoesFiltradas.reduce((acc, t) => {
    const dia = t.data.split('-')[2];
    if (!acc[dia]) acc[dia] = { ganho: 0, gasto: 0 };
    acc[dia][t.tipo] += t.valor;
    return acc;
  }, {});
  const diasOrdenados = Object.keys(dadosPorDia).sort();

  return (
    <div className="container">
      <header>
        <div className="header-info">
          <h1>Motorista Pro</h1>
          <p>Mês: <strong>{totalKmMes.toFixed(1)} km</strong> rodados</p>
          <p className="user-info">👤 {usuarioAtual?.displayName || usuarioAtual?.email}</p>
        </div>
        <div className="controles-topo">
          <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} />
          <button onClick={exportarPDF} className="btn-pdf-header">PDF</button>
          <button onClick={fazerLogout} className="btn-logout">🚪 Sair</button>
        </div>
      </header>

      {/* DASHBOARD VISUAL */}
      <div className="dashboard-visual">
        <div className="row-charts">
          <div className="chart-mini">
            <Doughnut data={{
              labels: ['Ganhos', 'Gastos'],
              datasets: [{ data: [totalGanhos, totalGastos], backgroundColor: ['#10b981', '#ef4444'] }]
            }} options={{ maintainAspectRatio: false }} />
          </div>
          <div className="chart-info">
            <h2 className={saldoFinal >= 0 ? "verde" : "vermelho"}>R$ {saldoFinal.toFixed(2)}</h2>
            <small>Saldo Líquido</small>
          </div>
        </div>
        
        {/* NOVAS ESTATÍSTICAS */}
        <div className="stats-grid">
          <div className="stat-card success">
            <div className="stat-label">Média Diária</div>
            <div className="stat-value">R$ {mediaGanhosPorDia.toFixed(2)}</div>
            <div className="stat-detail">{diasComDados} dias com ganhos</div>
          </div>
          
          <div className="stat-card primary">
            <div className="stat-label">Lucro por KM</div>
            <div className="stat-value">R$ {lucroLiquidoPorKm.toFixed(2)}</div>
            <div className="stat-detail">{totalKmMes.toFixed(0)} km rodados</div>
          </div>
          
          <div className="stat-card accent">
            <div className="stat-label">Eficiência</div>
            <div className="stat-value">{eficienciaLucro.toFixed(1)}%</div>
            <div className="stat-detail">de lucro sobre ganhos</div>
          </div>
          
          <div className="stat-card danger">
            <div className="stat-label">Combustível</div>
            <div className="stat-value">R$ {gastoCombustivel.toFixed(2)}</div>
            <div className="stat-detail">{((gastoCombustivel/totalGastos)*100).toFixed(0)}% dos gastos</div>
          </div>
        </div>

        {/* COMPARATIVO PLATAFORMAS */}
        <div className="plataforma-comparison">
          <div className="plat-item">
            <img src={logoUber} alt="Uber" className="plat-logo" />
            <div className="plat-info">
              <span className="plat-name">Uber</span>
              <span className="plat-valor">R$ {ganhosPorUber.toFixed(2)}</span>
            </div>
            <div className="plat-percent">{totalGanhos > 0 ? ((ganhosPorUber/totalGanhos)*100).toFixed(0) : 0}%</div>
          </div>
          <div className="plat-item">
            <img src={logo99} alt="99" className="plat-logo" />
            <div className="plat-info">
              <span className="plat-name">99</span>
              <span className="plat-valor">R$ {ganhosPor99.toFixed(2)}</span>
            </div>
            <div className="plat-percent">{totalGanhos > 0 ? ((ganhosPor99/totalGanhos)*100).toFixed(0) : 0}%</div>
          </div>
          <div className="plat-item">
            <img src={logoShopee} alt="Shopee" className="plat-logo" />
            <div className="plat-info">
              <span className="plat-name">Shopee</span>
              <span className="plat-valor">R$ {ganhosPorShopee.toFixed(2)}</span>
            </div>
            <div className="plat-percent">{totalGanhos > 0 ? ((ganhosPorShopee/totalGanhos)*100).toFixed(0) : 0}%</div>
          </div>
          <div className="plat-item">
            <img src={logoMercadoLivre} alt="Mercado Livre" className="plat-logo" />
            <div className="plat-info">
              <span className="plat-name">M. Livre</span>
              <span className="plat-valor">R$ {ganhosPorMercadoLivre.toFixed(2)}</span>
            </div>
            <div className="plat-percent">{totalGanhos > 0 ? ((ganhosPorMercadoLivre/totalGanhos)*100).toFixed(0) : 0}%</div>
          </div>
          <div className="plat-item">
            <img src={logoIfood} alt="iFood" className="plat-logo" />
            <div className="plat-info">
              <span className="plat-name">iFood</span>
              <span className="plat-valor">R$ {ganhosPorIfood.toFixed(2)}</span>
            </div>
            <div className="plat-percent">{totalGanhos > 0 ? ((ganhosPorIfood/totalGanhos)*100).toFixed(0) : 0}%</div>
          </div>
        </div>
        
        <div className="chart-barras">
          <Bar data={{
            labels: diasOrdenados.map(d => `Dia ${d}`),
            datasets: [
              { label: 'Ganhos', data: diasOrdenados.map(d => dadosPorDia[d].ganho), backgroundColor: '#10b981' },
              { label: 'Gastos', data: diasOrdenados.map(d => dadosPorDia[d].gasto), backgroundColor: '#ef4444' }
            ]
          }} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

      <div className="calc-combustivel">
        <h3>⛽ Calculadora de Abastecimento</h3>
        <div className="grid-3">
          <div className="input-group"><label>KM rodados</label><input type="number" value={km} onChange={(e)=>setKm(e.target.value)} /></div>
          <div className="input-group"><label>KM/L</label><input type="number" value={kml} onChange={(e)=>setKml(e.target.value)} /></div>
          <div className="input-group"><label>Preço/L</label><input type="number" value={precoLitro} onChange={(e)=>setPrecoLitro(e.target.value)} /></div>
        </div>
        <button type="button" onClick={calcularGastoCombustivel} className="btn-calc-premium">Calcular Custo e Aplicar</button>
      </div>

      <form ref={formularioRef} onSubmit={adicionarTransacao} className={`formulario ${editandoId ? 'modo-edicao' : ''}`}>
        {editandoId && <div className="aviso-edicao">✏️ Modo Edição</div>}
        {tipo === 'ganho' && (
          <div className="seletor-plataforma">
            <div className={`opcao-plataforma ${plataforma === 'Uber' ? 'ativa-uber' : ''}`} onClick={() => setPlataforma('Uber')}>
              <img src={logoUber} alt="Uber" />
              <span>Uber</span>
            </div>
            <div className={`opcao-plataforma ${plataforma === '99' ? 'ativa-99' : ''}`} onClick={() => setPlataforma('99')}>
              <img src={logo99} alt="99" />
              <span>99</span>
            </div>
            <div className={`opcao-plataforma ${plataforma === 'Shopee' ? 'ativa-shopee' : ''}`} onClick={() => setPlataforma('Shopee')}>
              <img src={logoShopee} alt="Shopee" />
              <span>Shopee</span>
            </div>
            <div className={`opcao-plataforma ${plataforma === 'Mercado Livre' ? 'ativa-mercadolivre' : ''}`} onClick={() => setPlataforma('Mercado Livre')}>
              <img src={logoMercadoLivre} alt="Mercado Livre" />
              <span>M. Livre</span>
            </div>
            <div className={`opcao-plataforma ${plataforma === 'iFood' ? 'ativa-ifood' : ''}`} onClick={() => setPlataforma('iFood')}>
              <img src={logoIfood} alt="iFood" />
              <span>iFood</span>
            </div>
          </div>
        )}

        <div className="row">
          <input type="text" placeholder="Descrição" value={descricao} onChange={(e)=>setDescricao(e.target.value)} />
          <input type="date" value={data} onChange={(e)=>setData(e.target.value)} />
        </div>
        <div className="row">
          <input type="number" placeholder="Valor R$" value={valor} onChange={(e)=>setValor(e.target.value)} />
          <select value={tipo} onChange={(e)=>setTipo(e.target.value)}>
            <option value="ganho">Ganho (+)</option>
            <option value="gasto">Gasto (-)</option>
          </select>
        </div>
        <div className="row">
          <select value={veiculo} onChange={(e)=>setVeiculo(e.target.value)} required>
            <option value="">Selecione o Veículo *</option>
            <option value="carro">🚗 Carro</option>
            <option value="moto">🏍️ Moto</option>
          </select>
        </div>
        <div className="row-botoes">
          <button type="submit" className="btn-save">{editandoId ? '✏️ Atualizar Registro' : '➕ Confirmar Registro'}</button>
          {editandoId && <button type="button" onClick={cancelarEdicao} className="btn-cancel">❌ Cancelar</button>}
        </div>
      </form>

      <div className="historico-container">
        <h3>Lançamentos de {mesFiltro}</h3>
        <ul className="lista">
          {transacoesFiltradas.map(t => (
            <li key={t.id} className={t.tipo}>
              <div className="info-item">
                <small>{t.data.split('-').reverse().join('/')}</small>
                <div className="flex-row">
                  {t.descricao.startsWith('Uber') && <img src={logoUber} className="mini-logo" alt="Uber" />}
                  {t.descricao.startsWith('99') && <img src={logo99} className="mini-logo" alt="99" />}
                  {t.descricao.startsWith('Shopee') && <img src={logoShopee} className="mini-logo" alt="Shopee" />}
                  {t.descricao.startsWith('Mercado Livre') && <img src={logoMercadoLivre} className="mini-logo" alt="Mercado Livre" />}
                  {t.descricao.startsWith('iFood') && <img src={logoIfood} className="mini-logo" alt="iFood" />}
                  {t.veiculo && <span className="badge-veiculo">{t.veiculo === 'carro' ? '🚗' : '🏍️'}</span>}
                  <span>{t.descricao}</span>
                </div>
              </div>
              <div className="valor-item">
                <strong className={t.tipo === 'ganho' ? "verde" : "vermelho"}>R$ {t.valor.toFixed(2)}</strong>
                <div className="acoes-item">
                  <button onClick={() => editarTransacao(t)} className="btn-edit">✏️</button>
                  <button onClick={() => removerTransacao(t.id)} className="btn-del">🗑️</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;