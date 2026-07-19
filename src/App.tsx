import React, { useState, useRef, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Copy, 
  Search, 
  FileText, 
  Sparkles,
  ArrowRight,
  Info,
  Calendar,
  DollarSign,
  MapPin,
  ClipboardCheck,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { parsePDFFile, parsePastedText, ExtractedRecord } from './utils/parser';

// The exact data shown in the user's provided image for instant zero-config testing!
const SAMPLE_TEXT = `Hóspedes Estrangeiros com Contas Encerradas

Check-in   Check- out       UH        Nota Tipo Pagto       Empresa Tipo Pagto        Hóspede       Diária
---------------------------------------------------------------------------------------------------------
                     Nome   ST HILAIRE, DONOVAN                       Origem   CANADA
26/06/2026 04/07/2026 0910  3414                              Cartao Credito Visa RE   228,00        340,00
---------------------------------------------------------------------------------------------------------
                     Nome   GUILBALT, KARINE                          Origem   ESTADOS UNIDOS
26/06/2026 04/07/2026 1106  3415                              Cartao Credito Visa RE   12,00         340,00
---------------------------------------------------------------------------------------------------------
                     Nome   MOREIRA, LEVI                             Origem   ESTADOS UNIDOS
27/06/2026 01/07/2026 0711  3258                              Cartao Credito Visa RE   100,00        604,42
---------------------------------------------------------------------------------------------------------
                     Nome   GUARDIA, EYSEL CHONG                      Origem   ESTADOS UNIDOS
27/06/2026 02/07/2026 1501  50656                             Cartao Credito Visa RE   2.158,83      873,00
---------------------------------------------------------------------------------------------------------
                     Nome   ZHU, WENLIN                               Origem   CHINA
28/06/2026 01/07/2026 1707  50637                             Cartao Credito Visa RE   2.891,70      315,00
---------------------------------------------------------------------------------------------------------
                     Nome   PILLAY, SURISHINEE PILLAY                 Origem   AFRICA DO SUL
28/06/2026 02/07/2026 0509  50707                             Cartao Credito Visa RE   306,00        302,40
28/06/2026 02/07/2026       3401                              Dinheiro                 12,00         302,40`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [records, setRecords] = useState<ExtractedRecord[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'validated' | 'unidentified' | 'all'>('validated');
  
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse files and handle events
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Por favor, envie um arquivo no formato PDF.');
      return;
    }

    setIsParsing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const parsed = await parsePDFFile(file);
      if (parsed.length === 0) {
        setError(
          'Nenhum dado pôde ser extraído deste PDF. Verifique se o formato coincide com o esperado (Checkouts, Nome, Origem, Nota).'
        );
      } else {
        setRecords(parsed);
        const validCount = parsed.filter(r => r.isFiveDigits).length;
        setSuccessMessage(
          `Sucesso! Processado o arquivo "${file.name}". Foram encontrados ${parsed.length} registros no total, sendo ${validCount} validados com nota de 5 dígitos.`
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao processar o arquivo PDF: ${err.message || err}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Drag over handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Drop handler
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  // Paste handler
  const handleParsePaste = () => {
    if (!pastedText.trim()) {
      setError('Por favor, cole o texto do relatório antes de processar.');
      return;
    }

    setIsParsing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const parsed = parsePastedText(pastedText);
      if (parsed.length === 0) {
        setError(
          'Nenhum dado estruturado pôde ser extraído do texto colado. Verifique a formatação do relatório.'
        );
      } else {
        setRecords(parsed);
        const validCount = parsed.filter(r => r.isFiveDigits).length;
        setSuccessMessage(
          `Sucesso! Processado o texto colado. Encontrados ${parsed.length} registros no total, sendo ${validCount} com nota de 5 dígitos.`
        );
      }
    } catch (err: any) {
      setError(`Erro ao processar texto: ${err.message || err}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Load sample data for user convenience
  const loadSampleData = () => {
    setPastedText(SAMPLE_TEXT);
    setActiveTab('paste');
    const parsed = parsePastedText(SAMPLE_TEXT);
    setRecords(parsed);
    setSuccessMessage(
      'Dados de exemplo carregados com sucesso! Veja os resultados estruturados abaixo.'
    );
    setError(null);
  };

  // Reset all states
  const handleReset = () => {
    setRecords([]);
    setPastedText('');
    setSearchQuery('');
    setError(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to parse currency into a proper float for calculations
  const parseCurrencyValue = (valStr: string): number => {
    // Examples: "2.158,83" -> 2158.83, "228,00" -> 228
    const cleanStr = valStr.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to parse DD/MM/YYYY date strings into a comparable number (timestamp)
  const parseDateToComparable = (dateStr: string): number => {
    if (!dateStr) return 0;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
    return 0;
  };

  // Filter records based on selected mode and search query, and sort by checkout date (ascending)
  const processedRecords = useMemo(() => {
    let list = records;

    // Filter by Nota Tipo Pagto length of 5 digits if corresponding mode is active
    if (filterMode === 'validated') {
      list = list.filter(r => r.isFiveDigits);
    } else if (filterMode === 'unidentified') {
      list = list.filter(r => !r.nota || r.nota.trim() === '');
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.guestName.toLowerCase().includes(query) ||
          r.guestOrigin.toLowerCase().includes(query) ||
          r.nota.includes(query) ||
          r.uh.includes(query) ||
          r.paymentType.toLowerCase().includes(query)
      );
    }

    // Sort chronologically by checkout date (ascending)
    const sortedList = [...list].sort((a, b) => {
      return parseDateToComparable(a.checkOut) - parseDateToComparable(b.checkOut);
    });

    return sortedList;
  }, [records, filterMode, searchQuery]);

  // Calculations for KPI metric cards
  const metrics = useMemo(() => {
    const validatedOnly = records.filter(r => r.isFiveDigits);
    const unidentifiedOnly = records.filter(r => !r.nota || r.nota.trim() === '');

    const totalValidatedValue = validatedOnly.reduce((acc, curr) => {
      return acc + parseCurrencyValue(curr.valor);
    }, 0);

    const totalUnidentifiedValue = unidentifiedOnly.reduce((acc, curr) => {
      return acc + parseCurrencyValue(curr.valor);
    }, 0);

    const totalAllValue = records.reduce((acc, curr) => {
      return acc + parseCurrencyValue(curr.valor);
    }, 0);

    return {
      totalValidatedCount: validatedOnly.length,
      totalUnidentifiedCount: unidentifiedOnly.length,
      totalCount: records.length,
      totalValidatedValue,
      totalUnidentifiedValue,
      totalAllValue
    };
  }, [records]);

  // Export to Excel file using SheetJS XLSX, sorted chronologically by checkout date
  const handleExportExcel = (mode: 'validated' | 'unidentified' | 'all') => {
    const columnWidths = [
      { wch: 18 }, // DATA DE CHECKOUT
      { wch: 18 }, // RPS (5 DIGITOS)
      { wch: 32 }, // NOME
      { wch: 28 }, // BANDEIRA
      { wch: 20 }, // PAÍS
      { wch: 14 }  // VALOR
    ];

    const workbook = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().split('T')[0];
    let filename = '';

    if (mode === 'validated') {
      const validsToExport = records.filter(r => r.isFiveDigits);
      if (validsToExport.length === 0) {
        setError('Não há registros validados para exportar.');
        return;
      }
      
      // Sort chronologically (ascending)
      const sortedValids = [...validsToExport].sort((a, b) => {
        return parseDateToComparable(a.checkOut) - parseDateToComparable(b.checkOut);
      });

      const sheetData = sortedValids.map(r => ({
        'DATA DE CHECKOUT': r.checkOut,
        'RPS (5 DIGITOS)': Number(r.nota) || r.nota,
        'NOME': r.guestName,
        'BANDEIRA': r.paymentType,
        'PAÍS': r.guestOrigin,
        'VALOR': parseCurrencyValue(r.valor)
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      worksheet['!cols'] = columnWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Checkouts Validados');
      filename = `Relatorio_Validados_5_Digitos_${dateStr}.xlsx`;
    } 
    else if (mode === 'unidentified') {
      const unidentifiedsToExport = records.filter(r => !r.nota || r.nota.trim() === '');
      if (unidentifiedsToExport.length === 0) {
        setError('Não há registros sem código para exportar.');
        return;
      }

      // Sort chronologically (ascending)
      const sortedUnidentifieds = [...unidentifiedsToExport].sort((a, b) => {
        return parseDateToComparable(a.checkOut) - parseDateToComparable(b.checkOut);
      });

      const sheetData = sortedUnidentifieds.map(r => ({
        'DATA DE CHECKOUT': r.checkOut,
        'RPS (5 DIGITOS)': 'Sem Código',
        'NOME': r.guestName,
        'BANDEIRA': r.paymentType,
        'PAÍS': r.guestOrigin,
        'VALOR': parseCurrencyValue(r.valor)
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      worksheet['!cols'] = columnWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sem Código');
      filename = `Relatorio_Sem_Codigo_${dateStr}.xlsx`;
    } 
    else {
      // mode === 'all'
      // Create multi-tab (multi-sheet) workbook!
      // Tab 1: Checkouts Validados
      const valids = records.filter(r => r.isFiveDigits);
      const sortedValids = [...valids].sort((a, b) => {
        return parseDateToComparable(a.checkOut) - parseDateToComparable(b.checkOut);
      });

      const sheetDataValids = sortedValids.map(r => ({
        'DATA DE CHECKOUT': r.checkOut,
        'RPS (5 DIGITOS)': Number(r.nota) || r.nota,
        'NOME': r.guestName,
        'BANDEIRA': r.paymentType,
        'PAÍS': r.guestOrigin,
        'VALOR': parseCurrencyValue(r.valor)
      }));
      const worksheetValids = XLSX.utils.json_to_sheet(sheetDataValids);
      worksheetValids['!cols'] = columnWidths;
      XLSX.utils.book_append_sheet(workbook, worksheetValids, 'Checkouts Validados');

      // Tab 2: Sem Código
      const unidentifieds = records.filter(r => !r.nota || r.nota.trim() === '');
      const sortedUnidentifieds = [...unidentifieds].sort((a, b) => {
        return parseDateToComparable(a.checkOut) - parseDateToComparable(b.checkOut);
      });

      const sheetDataUnidentifieds = sortedUnidentifieds.map(r => ({
        'DATA DE CHECKOUT': r.checkOut,
        'RPS (5 DIGITOS)': 'Sem Código',
        'NOME': r.guestName,
        'BANDEIRA': r.paymentType,
        'PAÍS': r.guestOrigin,
        'VALOR': parseCurrencyValue(r.valor)
      }));
      const worksheetUnidentifieds = XLSX.utils.json_to_sheet(sheetDataUnidentifieds);
      worksheetUnidentifieds['!cols'] = columnWidths;
      XLSX.utils.book_append_sheet(workbook, worksheetUnidentifieds, 'Sem Código');

      filename = `Relatorio_Completo_Todos_${dateStr}.xlsx`;
    }

    XLSX.writeFile(workbook, filename);
  };

  return (
    <div id="main_app_container" className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 pb-12">
      {/* App Header */}
      <header id="app_header" className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                RelatExtractor <span className="text-slate-400 font-normal">v2.1</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Sistema Pronto
              </span>
              <span className="text-slate-300">|</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                id="btn_load_sample"
                onClick={loadSampleData}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-lg transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Testar com Exemplo
              </button>
              {records.length > 0 && (
                <button
                  id="btn_clear_data"
                  onClick={handleReset}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main id="app_main_content" className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          {/* Left panel: Config and Input */}
          <section id="input_panel" className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Origem dos Dados
              </h2>

              {/* Tabs for switching upload mode */}
              <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                <button
                  id="tab_upload_pdf"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-md transition-all ${
                    activeTab === 'upload'
                      ? 'bg-white text-slate-900 shadow-xs border-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                  Importar PDF
                </button>
                <button
                  id="tab_paste_text"
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-md transition-all ${
                    activeTab === 'paste'
                      ? 'bg-white text-slate-900 shadow-xs border-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5 inline mr-1.5" />
                  Colar Texto
                </button>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'upload' ? (
                  <motion.div
                    key="upload-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    {/* Drag and Drop Zone */}
                    <div
                      id="drop_zone"
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                        dragActive
                          ? 'border-blue-500 bg-blue-50/40 scale-[0.99]'
                          : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-slate-50/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm font-semibold text-slate-700">
                        Clique ou arraste o arquivo PDF aqui
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Suporta apenas relatórios em PDF
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="paste-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <textarea
                        id="raw_text_area"
                        rows={8}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Cole as linhas do seu relatório aqui...
Exemplo:
Nome   ST HILAIRE, DONOVAN                       Origem   CANADA
26/06/2026 04/07/2026 0910  3414                              Cartao Credito Visa RE   228,00        340,00"
                        className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-y"
                      />
                    </div>
                    <button
                      id="btn_process_paste"
                      onClick={handleParsePaste}
                      disabled={isParsing}
                      className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-xs shadow-slate-200 text-xs flex items-center justify-center gap-2"
                    >
                      {isParsing ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="w-4 h-4" />
                          Processar Texto Colado
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Validation rules and instructions summary in Clean Minimalism visual list styles */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4 shadow-xs">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Regras de Validação Solicitadas
              </h2>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">1</div>
                  <span className="text-xs text-slate-700"><strong>Data de Checkout:</strong> Extraída das colunas correspondentes</span>
                </li>
                <li className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">2</div>
                  <span className="text-xs text-slate-700"><strong>Nome do Hóspede:</strong> Identificado por linhas com <code>Nome</code></span>
                </li>
                <li className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">3</div>
                  <span className="text-xs text-slate-700"><strong>Origem:</strong> Identificada por linhas com <code>Origem</code></span>
                </li>
                <li className="flex items-center gap-3 p-3.5 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">4</div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Filtro Numérico</span>
                    <span className="text-[10px] text-amber-600 uppercase font-bold tracking-wider">Somente 5 dígitos (Nota Tipo Pagto)</span>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* Right panel: Results */}
          <section id="results_panel" className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Notifications */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="err-msg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 shadow-xs"
                >
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold">Atenção</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  key="suc-msg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-start gap-3 shadow-xs"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold">Sucesso</p>
                    <p className="mt-0.5">{successMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {records.length > 0 && (
              <div id="stats_dashboard" className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                {/* Metrics 1 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Checkouts Validados</span>
                    <span className="text-xl font-bold text-slate-900 block mt-0.5">
                      {metrics.totalValidatedCount}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Com nota de 5 dígitos
                    </span>
                  </div>
                </div>

                {/* Metrics 2 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sem Código</span>
                    <span className="text-xl font-bold text-slate-900 block mt-0.5">
                      {metrics.totalUnidentifiedCount}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Registros sem qualquer código
                    </span>
                  </div>
                </div>

                {/* Metrics 3 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Faturamento Validado</span>
                    <span className="text-xl font-bold text-slate-900 block mt-0.5">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalValidatedValue)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalAllValue)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Data View */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[350px]">
              {records.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <div className="w-12 h-12 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 mb-4">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Visualização dos Dados Estruturados</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Carregue um arquivo PDF na barra lateral para extrair as tabelas e exportar para Excel.
                  </p>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white rounded-t-2xl">
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 w-full sm:w-auto overflow-x-auto">
                      <button
                        id="btn_filter_validated"
                        onClick={() => setFilterMode('validated')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                          filterMode === 'validated'
                            ? 'bg-white text-blue-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Validados ({metrics.totalValidatedCount})
                      </button>
                      <button
                        id="btn_filter_unidentified"
                        onClick={() => setFilterMode('unidentified')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                          filterMode === 'unidentified'
                            ? 'bg-white text-blue-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Sem Código ({metrics.totalUnidentifiedCount})
                      </button>
                      <button
                        id="btn_filter_all"
                        onClick={() => setFilterMode('all')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                          filterMode === 'all'
                            ? 'bg-white text-blue-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Todos ({metrics.totalCount})
                      </button>
                    </div>

                    {/* Search Field */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        id="search_records_input"
                        type="text"
                        placeholder="Buscar por hóspede, nota..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Excel Export Row with gorgeous style */}
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Exibindo <strong>{processedRecords.length}</strong> de {records.length} registros identificados no PDF
                    </span>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                      {filterMode === 'validated' && (
                        <button
                          id="btn_export_validated"
                          onClick={() => handleExportExcel('validated')}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Exportar Validados (.xlsx)
                        </button>
                      )}
                      {filterMode === 'unidentified' && (
                        <button
                          id="btn_export_unidentified"
                          onClick={() => handleExportExcel('unidentified')}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Exportar Sem Código (.xlsx)
                        </button>
                      )}
                      {filterMode === 'all' && (
                        <>
                          <button
                            id="btn_export_all"
                            onClick={() => handleExportExcel('all')}
                            className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Exportar Pasta Completa (.xlsx)
                          </button>
                          <button
                            id="btn_export_only_val"
                            onClick={() => handleExportExcel('validated')}
                            className="flex-1 sm:flex-none px-3.5 py-2 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                          >
                            Apenas Validados
                          </button>
                          <button
                            id="btn_export_only_unid"
                            onClick={() => handleExportExcel('unidentified')}
                            className="flex-1 sm:flex-none px-3.5 py-2 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                          >
                            Apenas Sem Código
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Responsive Table Container formatted identically to Design HTML */}
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4">Data Checkout</th>
                          <th className="px-6 py-4">Nome Completo</th>
                          <th className="px-6 py-4">Origem / Pagto</th>
                          <th className="px-6 py-4 text-center">UH</th>
                          <th className="px-6 py-4 text-center">Código Sis</th>
                          <th className="px-6 py-4 text-right">Valor Extraído</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        <AnimatePresence initial={false}>
                          {processedRecords.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-slate-400 italic text-xs">
                                Nenhum registro encontrado para os filtros atuais.
                              </td>
                            </tr>
                          ) : (
                            processedRecords.map((record, index) => (
                              <motion.tr
                                key={record.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.1, delay: Math.min(index * 0.02, 0.2) }}
                                className={`hover:bg-slate-50 transition-colors text-xs ${
                                  !record.isFiveDigits && filterMode === 'all' ? 'opacity-60 bg-slate-50/20' : ''
                                }`}
                              >
                                {/* Checkout Date */}
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                  {record.checkOut}
                                </td>

                                {/* Guest Name */}
                                <td className="px-6 py-4 font-medium text-slate-900">
                                  {record.guestName}
                                </td>

                                {/* Origin & Payment details */}
                                <td className="px-6 py-4 text-slate-500 italic">
                                  <div className="font-semibold text-slate-700">{record.paymentType}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Origem: {record.guestOrigin}
                                  </div>
                                </td>

                                {/* Room / UH */}
                                <td className="px-6 py-4 text-center font-mono text-slate-600 font-semibold">
                                  {record.uh || <span className="text-slate-300">-</span>}
                                </td>

                                {/* Note Badge */}
                                <td className="px-6 py-4 text-center">
                                  {record.nota ? (
                                    <span
                                      className={`px-2 py-1 rounded font-mono text-xs ${
                                        record.isFiveDigits
                                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {record.nota}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                                      Sem Código
                                    </span>
                                  )}
                                </td>

                                {/* Value Extraído */}
                                <td className="px-6 py-4 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                                  R$ {record.valor}
                                  <div className="text-[9px] text-slate-400 font-normal">
                                    Diária: R$ {record.diaria}
                                  </div>
                                </td>
                              </motion.tr>
                            ))
                          )}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
