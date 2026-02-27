import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, ArcElement, Tooltip, Legend, 
  CategoryScale, LinearScale, BarElement, Title 
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css';
import logoUber from './assets/uber.png'; 
import logo99 from './assets/99.png'; 

// --- IMPORTAÇÕES DO FIREBASE ---
import { db } from './firebase'; 
import { 
  collection, addDoc, onSnapshot, query, 
  orderBy, deleteDoc, doc 
} from "firebase/firestore";

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
  const [km, setKm] = useState('');
  const [kml, setKml] = useState('');
  const [precoLitro, setPrecoLitro] = useState('');

  // --- BUSCAR DADOS DO FIREBASE (TEMPO REAL) ---
  useEffect(() => {
    // Busca na coleção 'transacoes' e ordena por data
    const q = query(collection(db, "transacoes"), orderBy("data", "desc"));
    
    // O onSnapshot atualiza o app sozinho se algo mudar no banco
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map(doc => ({
        id: doc.id, // O ID agora é gerado pelo Firebase
        ...doc.data()
      }));
      setTransacoes(dados);
    });

    return () => unsubscribe(); // Fecha a conexão ao sair do app
  }, []);

  // --- CÁLCULOS (FILTROS) ---
  const transacoesFiltradas = transacoes.filter(t => t.data.startsWith(mesFiltro));
  const totalGanhos = transacoesFiltradas.filter(t => t.tipo === 'ganho').reduce((acc, t) => acc + t.valor, 0);
  const totalGastos = transacoesFiltradas.filter(t => t.tipo === 'gasto').reduce((acc, t) => acc + t.valor, 0);
  const saldoFinal = totalGanhos - totalGastos;
  const totalKmMes = transacoesFiltradas.reduce((acc, t) => acc + (t.distanciaPercorrida || 0), 0);

  // --- ADICIONAR NO FIREBASE ---
  const adicionarTransacao = async (e) => {
    e.preventDefault();
    if (!descricao || !valor) return alert("Preencha os campos!");

    const descricaoFinal = tipo === 'ganho' ? `${plataforma}: ${descricao}` : descricao;

    try {
      await addDoc(collection(db, "transacoes"), {
        descricao: descricaoFinal,
        valor: parseFloat(valor),
        tipo,
        data,
        distanciaPercorrida: (descricao.includes("Combustível") && km) ? parseFloat(km) : 0,
        criadoEm: new Date()
      });
      
      // Limpar campos
      setDescricao(''); setValor(''); setKm(''); setKml(''); setPrecoLitro('');
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  // --- REMOVER DO FIREBASE ---
  const removerTransacao = async (id) => {
    if(window.confirm("Deseja apagar este registro?")) {
      await deleteDoc(doc(db, "transacoes", id));
    }
  };

  // --- FUNÇÕES DE APOIO (PDF E CÁLCULOS) ---
  const exportarPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text(`Relatorio Mensal - ${mesFiltro}`, 14, 20);
    autoTable(docPdf, {
      startY: 40,
      head: [['Data', 'Descrição', 'Tipo', 'Valor']],
      body: transacoesFiltradas.map(t => [
        t.data.split('-').reverse().join('/'), 
        t.descricao, 
        t.tipo.toUpperCase(), 
        `R$ ${t.valor.toFixed(2)}`
      ]),
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
        </div>
        <div className="controles-topo">
          <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} />
          <button onClick={exportarPDF} className="btn-pdf-header">PDF</button>
        </div>
      </header>

      {/* DASHBOARD VISUAL */}
      <div className="dashboard-visual">
        <div className="row-charts">
          <div className="chart-mini">
            <Doughnut data={{
              labels: ['Ganhos', 'Gastos'],
              datasets: [{ data: [totalGanhos, totalGastos], backgroundColor: ['#2ecc71', '#e74c3c'] }]
            }} options={{ maintainAspectRatio: false }} />
          </div>
          <div className="chart-info">
            <h2 className={saldoFinal >= 0 ? "verde" : "vermelho"}>R$ {saldoFinal.toFixed(2)}</h2>
            <small>Saldo Líquido</small>
          </div>
        </div>
        <div className="chart-barras">
          <Bar data={{
            labels: diasOrdenados.map(d => `Dia ${d}`),
            datasets: [
              { label: 'Ganhos', data: diasOrdenados.map(d => dadosPorDia[d].ganho), backgroundColor: '#2ecc71' },
              { label: 'Gastos', data: diasOrdenados.map(d => dadosPorDia[d].gasto), backgroundColor: '#e74c3c' }
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

      <form onSubmit={adicionarTransacao} className="formulario">
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
        <button type="submit" className="btn-save">Confirmar Registro</button>
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
                  <span>{t.descricao}</span>
                </div>
              </div>
              <div className="valor-item">
                <strong className={t.tipo === 'ganho' ? "verde" : "vermelho"}>R$ {t.valor.toFixed(2)}</strong>
                <button onClick={() => removerTransacao(t.id)} className="btn-del">🗑️</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;