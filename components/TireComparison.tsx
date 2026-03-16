
import React, { useMemo } from 'react';
import { Tire, Vehicle, SystemSettings, InspectionRecord } from '../types';
import { X, Printer, AlertTriangle, TrendingDown, Calculator, Scale, DollarSign, ArrowRight, Activity, Layers, AlertOctagon, Disc, BarChart3, ShieldAlert, Trophy, ThumbsDown, Crown, CheckCircle2, Info, HelpCircle, Medal, ArrowUpRight } from 'lucide-react';

interface TireComparisonProps {
  tires: Tire[];
  vehicle: Vehicle;
  inspectionData: Record<string, InspectionRecord>;
  settings?: SystemSettings;
  onClose: () => void;
}

export const TireComparison: React.FC<TireComparisonProps> = ({ tires, vehicle, inspectionData, settings, onClose }) => {
  const minDepth = settings?.minTreadDepth || 3.0;
  const warnDepth = settings?.warningTreadDepth || 5.0;

  // Ordenar pneus por posição para a tabela
  const sortedTires = useMemo(() => {
      return [...tires].sort((a, b) => (a.position || '').localeCompare(b.position || ''));
  }, [tires]);

  // --- MOTOR DE ANÁLISE DETALHADA ---
  const tireAnalysis = useMemo(() => {
      return sortedTires.map(t => {
          const data = inspectionData[t.id] || ({} as Partial<InspectionRecord>);
          const currentDepth = data.depth !== undefined ? data.depth : t.currentTreadDepth;
          const pressure = data.pressure || t.pressure;
          const originalDepth = t.originalTreadDepth || 18.0;
          const price = t.price || 0;

          // 1. Vida Útil
          const totalRubber = originalDepth - minDepth;
          const remainingRubber = Math.max(0, currentDepth - minDepth);
          const lifePercentage = totalRubber > 0 ? (remainingRubber / totalRubber) * 100 : 0;

          // 2. Valor Residual (Quanto $$ ainda tem de borracha)
          const residualValue = price * (lifePercentage / 100);

          // 3. Projeção de KM Total (Passado + Futuro)
          const kmRunOnVehicle = t.installOdometer ? Math.max(0, vehicle.odometer - t.installOdometer) : 0;
          const totalKmRun = (t.totalKms || 0) + kmRunOnVehicle;
          
          let projectedTotalLife = 0;
          let remainingKm = 0;
          const depthConsumed = originalDepth - currentDepth;

          // Só projeta se tiver rodagem significativa e desgaste mensurável
          if (totalKmRun > 2000 && depthConsumed > 0.5) {
              const mmPerKm = depthConsumed / totalKmRun;
              remainingKm = remainingRubber / mmPerKm;
              
              // AQUI: A projeção agora é o KM TOTAL (Rodado + Restante)
              projectedTotalLife = totalKmRun + remainingKm;
              
              // Cap de segurança para evitar números irreais
              if (projectedTotalLife > 300000) projectedTotalLife = 300000;
          }

          // CPK Individual Estimado (Preço / Vida Total Projetada)
          // Se não tiver projeção (pneu novo), usa 0
          const cpk = projectedTotalLife > 0 ? price / projectedTotalLife : 0;

          // 4. Status Técnico
          let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
          let action = 'MANTER';
          
          if (currentDepth <= minDepth) {
              status = 'CRITICAL';
              action = 'TROCAR';
          } else if (currentDepth <= warnDepth) {
              status = 'WARNING';
              action = 'ATENÇÃO';
          }

          return {
              tire: t,
              currentDepth,
              pressure,
              lifePercentage: Math.max(0, lifePercentage),
              residualValue: Math.max(0, residualValue),
              projectedTotalLife,
              remainingKm,
              totalKmRun,
              cpk,
              status,
              action
          };
      });
  }, [sortedTires, inspectionData, vehicle.odometer, minDepth, warnDepth]);

  // --- ANÁLISE COMPARATIVA DE MARCAS (BENCHMARK) ---
  const brandAnalysis = useMemo(() => {
      const stats: Record<string, { totalLife: number, totalCpk: number, cpkCount: number, count: number, name: string, totalProjectedKm: number }> = {};
      
      tireAnalysis.forEach(item => {
          // Normaliza marca
          const brand = (item.tire.brand || 'OUTROS').toUpperCase().trim();
          if (!stats[brand]) stats[brand] = { totalLife: 0, totalCpk: 0, cpkCount: 0, count: 0, name: brand, totalProjectedKm: 0 };
          
          stats[brand].totalLife += item.lifePercentage;
          stats[brand].count++;
          
          if (item.projectedTotalLife > 0) {
              stats[brand].totalProjectedKm += item.projectedTotalLife;
              stats[brand].totalCpk += item.cpk;
              stats[brand].cpkCount++;
          }
      });

      const ranked = Object.values(stats)
          .map(s => {
              const avgCpk = s.cpkCount > 0 ? s.totalCpk / s.cpkCount : 0;
              const avgLifeKm = s.cpkCount > 0 ? s.totalProjectedKm / s.cpkCount : 0;
              return {
                  name: s.name,
                  avgLifePct: s.totalLife / s.count,
                  avgCpk,
                  avgLifeKm,
                  count: s.count,
                  hasData: s.cpkCount > 0
              };
          })
          .filter(s => s.hasData) // Só considera marcas com dados suficientes de rodagem
          .sort((a, b) => a.avgCpk - b.avgCpk); // Menor CPK (Melhor) primeiro

      return {
          winner: ranked.length > 0 ? ranked[0] : null,
          loser: ranked.length > 1 ? ranked[ranked.length - 1] : null,
          all: ranked
      };
  }, [tireAnalysis]);

  // --- ANÁLISE DE CONJUNTO (GEMINADOS) ---
  const twinsAnalysis = useMemo(() => {
      const issues: string[] = [];
      const groups: Record<string, typeof tireAnalysis> = {};

      tireAnalysis.forEach(item => {
          const pos = item.tire.position || '';
          const axle = pos.replace(/[A-Z]/g, ''); 
          const side = pos.includes('D') ? 'D' : (pos.includes('E') ? 'E' : '');
          if (axle && side) {
              const key = `${axle}${side}`;
              if (!groups[key]) groups[key] = [];
              groups[key].push(item);
          }
      });

      Object.entries(groups).forEach(([key, items]) => {
          if (items.length === 2) {
              const diff = Math.abs(items[0].currentDepth - items[1].currentDepth);
              if (diff > 3) {
                  issues.push(`Eixo ${key}: Dif. ${diff.toFixed(1)}mm`);
              }
          }
      });
      return issues;
  }, [tireAnalysis]);

  // --- KPIs GERAIS ---
  const fleetScore = useMemo(() => {
      if (tireAnalysis.length === 0) return 0;
      const totalLife = tireAnalysis.reduce((acc, t) => acc + t.lifePercentage, 0);
      return Math.round(totalLife / tireAnalysis.length);
  }, [tireAnalysis]);

  const totalResidual = tireAnalysis.reduce((acc, t) => acc + t.residualValue, 0);
  const replacementCost = tireAnalysis.filter(t => t.status === 'CRITICAL').length * 2800; 

  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const money5 = (val: number) => 'R$ ' + val.toFixed(5).replace('.', ',');

  const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const dateStr = new Date().toLocaleDateString('pt-BR');
      
      // --- GERAR HTML DO PARECER TÉCNICO ---
      let verdictHtml = '';

      if (brandAnalysis.winner) {
          const w = brandAnalysis.winner;
          // Se tiver um perdedor (loser), usa ele. Se não, se tiver mais de 1 marca, pega o segundo. Se só tiver 1 marca, null.
          const l = brandAnalysis.loser && brandAnalysis.loser.name !== w.name ? brandAnalysis.loser : (brandAnalysis.all.length > 1 ? brandAnalysis.all[1] : null);
          
          if (l) {
              const cpkDiff = l.avgCpk - w.avgCpk;
              const percentDiff = ((l.avgCpk / w.avgCpk) - 1) * 100;
              const kmDiff = w.avgLifeKm - l.avgLifeKm;

              verdictHtml = `
                <div class="benchmark-card">
                    <div class="benchmark-header">PARECER TÉCNICO: ANÁLISE DE CPK (Custo por KM)</div>
                    <div class="benchmark-grid">
                        <!-- VENCEDOR -->
                        <div class="bm-col win">
                            <div class="bm-tag">MELHOR DESEMPENHO</div>
                            <h2 class="bm-brand">${w.name}</h2>
                            <div class="bm-stat">
                                <span>CPK Médio:</span>
                                <strong>${money5(w.avgCpk)}</strong>
                            </div>
                            <div class="bm-stat">
                                <span>Vida Projetada:</span>
                                <strong>${Math.round(w.avgLifeKm).toLocaleString()} km</strong>
                            </div>
                            <div class="bm-summary">
                                Resumo: Apresenta maior durabilidade da borracha, entregando <strong>+${Math.round(kmDiff/1000)}k km</strong> de vida útil média.
                            </div>
                        </div>

                        <!-- PERDEDOR / COMPARATIVO -->
                        <div class="bm-col">
                            <div class="bm-tag gray">COMPARATIVO</div>
                            <h2 class="bm-brand" style="color: #64748b;">${l.name}</h2>
                            <div class="bm-stat">
                                <span>CPK Médio:</span>
                                <strong>${money5(l.avgCpk)}</strong>
                            </div>
                            <div class="bm-stat">
                                <span>Vida Projetada:</span>
                                <strong>${Math.round(l.avgLifeKm).toLocaleString()} km</strong>
                            </div>
                            <div class="bm-summary" style="color: #64748b;">
                                Resumo: Custo quilométrico <strong>${percentDiff.toFixed(1)}% maior</strong> devido ao desgaste mais acelerado nesta operação.
                            </div>
                        </div>
                    </div>
                    
                    <div class="verdict-footer">
                        <strong>RESULTADO FINAL:</strong> A utilização de pneus <strong>${w.name}</strong> gera uma economia técnica de 
                        <strong>R$ ${cpkDiff.toFixed(5)}</strong> a cada quilômetro rodado por pneu em relação à concorrente comparada.
                    </div>
                </div>
              `;
          } else {
              // Só uma marca detectada
              verdictHtml = `
                <div class="benchmark-card">
                    <div class="benchmark-header">PARECER TÉCNICO: DESEMPENHO UNIFICADO</div>
                    <div class="benchmark-body" style="text-align: center;">
                        <h2 style="margin: 10px 0; color: #0f172a;">${w.name}</h2>
                        <p>CPK Médio Apurado: <strong>${money5(w.avgCpk)}</strong></p>
                        <p>Vida Útil Média Projetada: <strong>${Math.round(w.avgLifeKm).toLocaleString()} km</strong></p>
                        <div class="recommendation" style="margin-top: 15px;">
                            Nota: Apenas uma marca foi identificada com rodagem suficiente para análise. Mantenha o monitoramento para criar histórico comparativo.
                        </div>
                    </div>
                </div>
              `;
          }
      } else {
          verdictHtml = '<div class="benchmark-card" style="border-color:#e2e8f0"><div class="benchmark-body">Dados de rodagem insuficientes para cálculo de CPK e Parecer Técnico.</div></div>';
      }

      // --- GERADOR DE ESQUEMA VISUAL SVG (OTIMIZADO PARA PRINT) ---
      const axleSpacing = 80; 
      const startY = 20;
      const svgHeight = startY + (vehicle.axles * axleSpacing) + 20;
      const svgWidth = 240; 
      const centerX = svgWidth / 2;
      
      // Aumentar escala para impressão (2x)
      const printScale = 2.0;
      const printWidth = svgWidth * printScale;
      const printHeight = svgHeight * printScale;

      const schematicSvg = `
        <svg width="${printWidth}" height="${printHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="margin: 0 auto; display: block; font-family: Arial, sans-serif;">
            <rect x="${centerX - 3}" y="10" width="6" height="${svgHeight - 20}" fill="#e2e8f0" rx="2" />
            ${Array.from({ length: vehicle.axles }).map((_, i) => {
                const y = startY + (i * axleSpacing); 
                const axleCenterY = y + 25; 
                const isSteer = vehicle.type === 'CAVALO' && i === 0;
                const axleWidth = isSteer ? 150 : 190;
                const axleX = centerX - (axleWidth / 2);
                let axleSvg = `<rect x="${axleX}" y="${axleCenterY - 3}" width="${axleWidth}" height="6" fill="#cbd5e1" rx="2" />`;

                const renderTireSVG = (pos: string, cx: number) => {
                    const analysis = tireAnalysis.find(item => item.tire.position === pos);
                    if (!analysis) {
                        return `<g opacity="0.3"><rect x="${cx - 14}" y="${y}" width="28" height="42" rx="3" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" /></g>`;
                    }
                    const { tire, status, currentDepth } = analysis;
                    const statusColor = status === 'CRITICAL' ? '#ef4444' : (status === 'WARNING' ? '#f59e0b' : '#10b981');
                    const brand = (tire.brand || 'N/A').toUpperCase().substring(0, 6); 
                    return `
                        <g>
                            <rect x="${cx - 14}" y="${y}" width="28" height="44" rx="3" fill="#1e293b" stroke="${statusColor}" stroke-width="1.5" />
                            <rect x="${cx - 18}" y="${y + 28}" width="36" height="18" rx="2" fill="white" stroke="#e2e8f0" stroke-width="0.5" />
                            <text x="${cx}" y="${y + 36}" text-anchor="middle" font-size="6" font-weight="900" fill="#0f172a">${tire.fireNumber}</text>
                            <text x="${cx}" y="${y + 43}" text-anchor="middle" font-size="4" font-weight="bold" fill="#64748b">${brand}</text>
                            <text x="${cx}" y="${y + 10}" text-anchor="middle" font-size="6" font-weight="bold" fill="white">${currentDepth.toFixed(1)}</text>
                            <text x="${cx}" y="${y - 4}" text-anchor="middle" font-size="6" font-weight="bold" fill="#64748b">${pos}</text>
                        </g>
                    `;
                };
                if (isSteer) {
                    axleSvg += renderTireSVG(`${i + 1}E`, centerX - 55);
                    axleSvg += renderTireSVG(`${i + 1}D`, centerX + 55);
                } else {
                    axleSvg += renderTireSVG(`${i + 1}EE`, centerX - 75);
                    axleSvg += renderTireSVG(`${i + 1}EI`, centerX - 40);
                    axleSvg += renderTireSVG(`${i + 1}DI`, centerX + 40);
                    axleSvg += renderTireSVG(`${i + 1}DE`, centerX + 75);
                }
                return axleSvg;
            }).join('')}
        </svg>
      `;

      const logoHtml = settings?.logoUrl 
        ? `<img src="${settings.logoUrl}" style="height: 40px; margin-right: 15px;" />` 
        : '';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laudo Técnico - ${vehicle.plate}</title>
            <style>
                @page { size: A4 portrait; margin: 10mm; }
                body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #334155; font-size: 9px; margin: 0; padding: 0; line-height: 1.3; }
                
                /* HEADER */
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
                .brand-block { display: flex; align-items: center; }
                .title-block h1 { margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.5px; }
                .title-block p { margin: 2px 0 0; font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 2px; }
                .meta-block { text-align: right; }
                .meta-plate { font-size: 16px; font-weight: 800; color: #0f172a; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: inline-block; }
                .meta-info { font-size: 9px; margin-top: 4px; color: #64748b; font-weight: 500; }

                /* BENCHMARK BOX (FEATURED) - NEW LAYOUT */
                .benchmark-card { border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .benchmark-header { background: #0f172a; color: white; font-weight: 900; font-size: 10px; padding: 8px 12px; text-transform: uppercase; letter-spacing: 1px; }
                .benchmark-grid { display: flex; border-bottom: 1px solid #e2e8f0; }
                .bm-col { flex: 1; padding: 15px; border-right: 1px solid #e2e8f0; }
                .bm-col:last-child { border-right: none; }
                .bm-col.win { background-color: #f0fdf4; } /* Green tint for winner */
                
                .bm-tag { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #166534; background: #dcfce7; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 5px; }
                .bm-tag.gray { color: #475569; background: #f1f5f9; }
                
                .bm-brand { margin: 0 0 10px 0; font-size: 16px; font-weight: 900; color: #0f172a; }
                .bm-stat { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #cbd5e1; }
                .bm-stat span { color: #64748b; font-weight: 600; }
                .bm-stat strong { color: #0f172a; }
                
                .bm-summary { font-size: 9px; color: #166534; margin-top: 8px; line-height: 1.4; font-style: italic; }
                
                .verdict-footer { background: #0f172a; color: white; padding: 10px 15px; font-size: 9px; line-height: 1.4; }
                .verdict-footer strong { color: #4ade80; }

                /* SCORE OVERVIEW */
                .kpi-grid { display: flex; gap: 10px; margin-bottom: 20px; }
                .kpi-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; text-align: center; background: #f8fafc; }
                .kpi-label { font-size: 7px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
                .kpi-value { font-size: 16px; font-weight: 900; color: #0f172a; }
                .text-green { color: #16a34a; }
                .text-red { color: #dc2626; }

                /* TABLE */
                table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
                th { background-color: #f1f5f9; color: #475569; font-weight: 800; text-transform: uppercase; text-align: left; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; font-size: 8px; }
                td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; color: #334155; }
                tr:nth-child(even) { background-color: #f8fafc; }
                tr:last-child td { border-bottom: none; }
                
                .col-pos { font-weight: 900; color: #0f172a; width: 35px; text-align: center; }
                .col-fire { font-family: 'Courier New', monospace; font-weight: 700; color: #475569; width: 60px; }
                .col-brand { font-weight: 600; text-transform: uppercase; }
                .col-model { color: #64748b; font-size: 8px; margin-left: 4px; }
                .col-depth { font-weight: 800; font-size: 10px; color: #0f172a; text-align: center; }
                .col-life { text-align: center; font-weight: 700; }
                .col-money { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; color: #475569; }
                .col-status { text-align: center; }
                .col-proj { text-align: right; color: #2563eb; font-weight: 700; }
                .col-km { text-align: right; font-weight: 700; color: #475569; }

                .status-badge { font-size: 7px; font-weight: 800; text-transform: uppercase; padding: 3px 6px; border-radius: 3px; color: #64748b; background: #f1f5f9; display: inline-block; min-width: 50px; text-align: center; }
                .st-maintain { color: #166534; background: #dcfce7; }
                .st-warning { color: #9a3412; background: #ffedd5; }
                .st-replace { color: #991b1b; background: #fee2e2; }

                /* VISUAL MAP */
                .map-section { page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 4px; padding: 20px; text-align: center; background: #fff; margin-top: 10px; }
                .map-title { font-weight: 800; font-size: 9px; text-transform: uppercase; color: #94a3b8; margin-bottom: 15px; display: block; letter-spacing: 1px; }

                /* SIGNATURES */
                .signatures { display: flex; justify-content: space-between; margin-top: 40px; page-break-inside: avoid; }
                .sig-box { width: 40%; border-top: 1px solid #0f172a; padding-top: 8px; text-align: center; }
                .sig-role { font-weight: 800; font-size: 9px; color: #0f172a; text-transform: uppercase; }
                .sig-date { font-size: 8px; color: #64748b; margin-top: 2px; }

                /* FOOTER */
                .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; color: #94a3b8; font-size: 7px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="brand-block">
                    ${logoHtml}
                    <div class="title-block">
                        <h1>Laudo Técnico</h1>
                        <p>Relatório de Performance de Pneus</p>
                    </div>
                </div>
                <div class="meta-block">
                    <div class="meta-plate">${vehicle.plate}</div>
                    <div class="meta-info">${vehicle.model} &bull; ${dateStr}</div>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-label">Saúde Geral</div>
                    <div class="kpi-value">${fleetScore}%</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Residual (Equity)</div>
                    <div class="kpi-value text-green">${money(totalResidual)}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Custo Reposição</div>
                    <div class="kpi-value text-red">${money(replacementCost)}</div>
                </div>
            </div>

            ${verdictHtml}

            <table>
                <thead>
                    <tr>
                        <th class="col-pos">Pos</th>
                        <th>Fogo</th>
                        <th>Marca / Modelo</th>
                        <th style="text-align:center">Sulco</th>
                        <th style="text-align:center">Vida Útil</th>
                        <th style="text-align:right">KM Atual</th>
                        <th style="text-align:right">Proj. Total</th>
                        <th style="text-align:center">PSI</th>
                        <th style="text-align:right">Residual</th>
                        <th style="text-align:center">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tireAnalysis.map(item => {
                        let stClass = 'st-maintain';
                        if (item.status === 'CRITICAL') stClass = 'st-replace';
                        else if (item.status === 'WARNING') stClass = 'st-warning';
                        
                        return `
                        <tr>
                            <td class="col-pos">${item.tire.position}</td>
                            <td class="col-fire">${item.tire.fireNumber}</td>
                            <td class="col-brand">${item.tire.brand} <span class="col-model">${item.tire.model}</span></td>
                            <td class="col-depth">${item.currentDepth.toFixed(1)}</td>
                            <td class="col-life">${Math.round(item.lifePercentage)}%</td>
                            <td class="col-km">${Math.round(item.totalKmRun).toLocaleString()}</td>
                            <td class="col-proj">${item.projectedTotalLife > 0 ? `${Math.round(item.projectedTotalLife/1000)}k` : '-'}</td>
                            <td style="text-align:center">${item.pressure}</td>
                            <td class="col-money">${money(item.residualValue)}</td>
                            <td class="col-status"><span class="status-badge ${stClass}">${item.action}</span></td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div class="map-section">
                <span class="map-title">Mapa de Posições e Estado Atual</span>
                ${schematicSvg}
            </div>

            <div class="signatures">
                <div class="sig-box">
                    <div class="sig-role">Gestor de Frota</div>
                    <div class="sig-date">Data: ____/____/________</div>
                </div>
                <div class="sig-box">
                    <div class="sig-role">Motorista / Responsável</div>
                    <div class="sig-date">Data: ____/____/________</div>
                </div>
            </div>

            <div class="footer">
                <div>
                    GM Control Pro v4.5 &bull; Documento gerado automaticamente.<br/>
                    Nota: Vida útil calculada com base no sulco original e limite técnico de ${minDepth}mm.
                </div>
                <div>ID: ${vehicle.id.substring(0,8).toUpperCase()}</div>
            </div>
            
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-7xl h-full max-h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 dark:bg-slate-950 gap-4 shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">
              <Scale className="h-7 w-7 text-indigo-600" /> Comparativo & Veredito
            </h3>
            <p className="text-sm text-slate-500 font-bold uppercase mt-1 flex items-center gap-2">
                Veículo: <span className="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">{vehicle.plate}</span> 
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
                onClick={handlePrint}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-900/20"
            >
                <Printer className="h-4 w-4" /> Relatório Veredito
            </button>
            <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 border border-transparent hover:border-slate-300 dark:hover:border-slate-700">
                <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* DASHBOARD KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Activity className="h-3 w-3"/> Score da Frota</p>
                <div className="flex items-end gap-2">
                    <span className={`text-4xl font-black ${fleetScore > 80 ? 'text-green-500' : fleetScore > 50 ? 'text-amber-500' : 'text-red-500'}`}>{fleetScore}</span>
                    <span className="text-sm font-bold text-slate-400 mb-1.5">/ 100</span>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between group relative cursor-help">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <DollarSign className="h-3 w-3"/> Valor Residual
                    <HelpCircle className="h-3 w-3 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                </p>
                <div className="absolute top-full left-0 mt-2 w-56 p-3 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-50 hidden group-hover:block border border-slate-700 animate-in fade-in slide-in-from-top-1">
                    <p className="font-bold mb-1">Patrimônio Restante</p>
                    <p className="leading-relaxed opacity-90">Este é o valor financeiro da borracha que <strong>ainda não foi consumida</strong>. Quanto maior, mais "novo" está o pneu em termos contábeis.</p>
                </div>
                <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-green-600 dark:text-green-400">{money(totalResidual)}</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Capital imobilizado (Borracha Útil)</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><AlertOctagon className="h-3 w-3 text-red-500"/> Risco Im. (Troca)</p>
                <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-red-600 dark:text-red-400">{money(replacementCost)}</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Custo de reposição (Pneus &lt; {minDepth}mm)</p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${twinsAnalysis.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${twinsAnalysis.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <Layers className="h-3 w-3"/> Montagem
                </p>
                {twinsAnalysis.length > 0 ? (
                    <div>
                        <span className="text-xl font-black text-red-600 dark:text-red-400">{twinsAnalysis.length} Erros</span>
                        <p className="text-[9px] text-red-500 font-bold mt-1 leading-tight">Diferença de altura em geminados detectada.</p>
                    </div>
                ) : (
                    <div>
                        <span className="text-xl font-black text-green-600 dark:text-green-400">100% OK</span>
                        <p className="text-[9px] text-green-500 font-bold mt-1">Nenhum conflito de geminados.</p>
                    </div>
                )}
            </div>
        </div>

        {/* BRAND BATTLE CARD (ON-SCREEN) */}
        {brandAnalysis.winner && brandAnalysis.all.length > 1 && (
            <div className="px-6 py-2 shrink-0">
                <div className="relative bg-gradient-to-r from-slate-900 to-indigo-900 dark:from-slate-800 dark:to-indigo-900 p-5 rounded-2xl border border-indigo-500/30 overflow-hidden shadow-lg flex items-center justify-between">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Trophy className="h-32 w-32 text-indigo-400"/></div>
                    
                    <div className="flex items-center gap-6 z-10">
                        <div className="flex flex-col items-center">
                            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-xl shadow-lg shadow-orange-500/20">
                                <Crown className="h-8 w-8 text-white"/>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest border border-yellow-400/30 px-2 py-0.5 rounded-full bg-yellow-400/10">Melhor Performance</span>
                            </div>
                            <h3 className="text-2xl font-black text-white">{brandAnalysis.winner.name}</h3>
                            <p className="text-indigo-200 text-xs font-medium mt-1">
                                Mantém <strong>{Math.round(brandAnalysis.winner.avgLifePct)}%</strong> de vida útil média em {brandAnalysis.winner.count} pneus.
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8 z-10 border-l border-white/10 pl-8">
                        {brandAnalysis.loser && (
                            <div className="text-right opacity-80">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Concorrente Direto</p>
                                <h4 className="text-lg font-bold text-slate-300">{brandAnalysis.loser.name}</h4>
                                <p className="text-xs text-slate-500">{Math.round(brandAnalysis.loser.avgLifePct)}% Vida Média</p>
                            </div>
                        )}
                        <div className="bg-indigo-600/50 p-3 rounded-lg border border-indigo-500/50 text-center min-w-[100px]">
                            <p className="text-[10px] font-black text-indigo-200 uppercase mb-1">Vantagem</p>
                            <p className="text-xl font-black text-white">+{Math.round(brandAnalysis.winner.avgLifePct - (brandAnalysis.loser?.avgLifePct || 0))}%</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TABELA AVANÇADA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 p-6">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead className="text-slate-400 font-bold text-[10px] uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900 z-10">
              <tr>
                <th className="pb-4 pl-2">Pos</th>
                <th className="pb-4">Identificação</th>
                <th className="pb-4 text-center w-32">Vida Útil Restante</th>
                <th className="pb-4 text-center">Pressão</th>
                <th className="pb-4 text-right">Projeção Final</th>
                <th className="pb-4 pl-4">Diagnóstico & Ação</th>
              </tr>
            </thead>
            <tbody>
              {tireAnalysis.map(item => {
                let barColor = 'bg-green-500';
                if (item.lifePercentage < 20) barColor = 'bg-red-500';
                else if (item.lifePercentage < 40) barColor = 'bg-amber-500';

                return (
                  <tr key={item.tire.id} className="group transition-all hover:translate-x-1">
                    {/* POSIÇÃO */}
                    <td className="align-middle">
                        <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 h-12 w-14 rounded-xl font-black text-sm flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                            {item.tire.position}
                        </div>
                    </td>

                    {/* IDENTIFICAÇÃO */}
                    <td className="align-middle bg-slate-50 dark:bg-slate-800/30 rounded-l-2xl p-4 border-y border-l border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                                <Disc className="h-5 w-5 text-slate-400"/>
                            </div>
                            <div>
                                <div className="font-black text-slate-800 dark:text-white text-lg font-mono leading-none mb-1">{item.tire.fireNumber}</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{item.tire.brand} {item.tire.model}</div>
                            </div>
                        </div>
                    </td>
                    
                    {/* VIDA ÚTIL (BARRA DE SULCO) */}
                    <td className="align-middle bg-slate-50 dark:bg-slate-800/30 p-4 border-y border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-2 w-full max-w-[140px] mx-auto">
                            <div className="flex justify-between items-end px-1">
                                <span className="font-black text-lg text-slate-700 dark:text-slate-300">
                                    {item.currentDepth.toFixed(1)} <span className="text-[10px] text-slate-400 font-bold">mm</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">{Math.round(item.lifePercentage)}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${item.lifePercentage}%` }}></div>
                            </div>
                        </div>
                    </td>

                    {/* PRESSÃO */}
                    <td className="align-middle bg-slate-50 dark:bg-slate-800/30 p-4 border-y border-slate-100 dark:border-slate-800 text-center">
                        <div className="inline-flex flex-col items-center justify-center p-2 rounded-xl min-w-[80px] border-2 border-transparent bg-white dark:bg-slate-900 shadow-sm">
                            <span className="font-black text-lg text-slate-600 dark:text-slate-300">
                                {item.pressure}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Alvo: {item.tire.targetPressure}</span>
                        </div>
                    </td>

                    {/* PROJEÇÃO */}
                    <td className="align-middle bg-slate-50 dark:bg-slate-800/30 p-4 border-y border-slate-100 dark:border-slate-800 text-right">
                        {item.projectedTotalLife > 0 ? (
                            <div>
                                <div className="font-black text-blue-600 dark:text-blue-400 text-lg flex items-center justify-end gap-1">
                                    {Math.round(item.projectedTotalLife / 1000)}k <span className="text-xs text-slate-400">km</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center justify-end gap-1">
                                    <TrendingDown className="h-3 w-3"/> Estimado Total
                                </div>
                            </div>
                        ) : (
                            <span className="text-xs text-slate-400 font-medium">Dados insuficientes</span>
                        )}
                    </td>

                    {/* DECISÃO */}
                    <td className="align-middle bg-slate-50 dark:bg-slate-800/30 rounded-r-2xl p-3 border-y border-r border-slate-100 dark:border-slate-800">
                        <div className={`flex items-center justify-between p-3 rounded-xl border border-l-4 shadow-sm h-full ${
                            item.status === 'CRITICAL' ? 'border-l-red-500 bg-white dark:bg-slate-900 border-red-100' : 
                            item.status === 'WARNING' ? 'border-l-amber-500 bg-white dark:bg-slate-900 border-amber-100' : 
                            'border-l-green-500 bg-white dark:bg-slate-900 border-slate-100'
                        }`}>
                            <div>
                                <div className={`font-black text-[10px] uppercase leading-tight tracking-wider ${
                                    item.status === 'CRITICAL' ? 'text-red-600' : 
                                    item.status === 'WARNING' ? 'text-amber-600' : 
                                    'text-green-600'
                                }`}>{item.action}</div>
                                {item.projectedTotalLife > 0 && (
                                    <div className="text-[9px] text-slate-400 font-bold mt-1">
                                        Rodou: {Math.round(item.totalKmRun / 1000)}k km
                                    </div>
                                )}
                            </div>
                            {item.status !== 'OK' && <ArrowRight className="h-4 w-4 text-slate-300" />}
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-[10px] font-medium text-slate-500">
           <div className="flex items-center gap-2">
               <BarChart3 className="h-4 w-4"/>
               <span>Cálculos baseados nas medições de sulco atuais vs. originais.</span>
           </div>
           <div className="flex gap-4">
               <span className="flex items-center gap-1.5"><ShieldAlert className="h-3 w-3 text-red-500"/> Crítico: &lt; {minDepth}mm</span>
               <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-500"/> Atenção: &lt; {warnDepth}mm</span>
           </div>
        </div>
      </div>
    </div>
  );
};
