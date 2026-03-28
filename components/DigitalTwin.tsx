import React, { FC } from 'react';
import { Tire, Vehicle, SystemSettings, VehicleType } from '../types';
import { isSteerAxle } from '../lib/vehicleUtils';

interface DigitalTwinProps {
  vehicle: Vehicle;
  mountedTires: Tire[];
  settings?: SystemSettings;
  vehicleTypes?: VehicleType[];
}

export const DigitalTwin: FC<DigitalTwinProps> = ({ vehicle, mountedTires, settings, vehicleTypes = [] }) => {
  const width = 280; 
  const cx = width / 2;
  const startY = 70;
  const axleSpacing = 85; 
  const totalHeight = startY + (vehicle.axles * axleSpacing) + 20;

  // Graphic Element Constants
  const tireW = 28;
  const tireH = 48;
  
  const renderTire = (pos: string, x: number, y: number) => {
    const tire = mountedTires.find(t => t.position === pos);
    
    // Visual Styles Logic based on Depth
    let fillColor = tire ? '#1e293b' : 'rgba(30, 41, 59, 0.1)'; 
    let strokeColor = tire ? '#334155' : '#475569';
    const strokeDash = tire ? 'none' : '4 4';

    let lifePercentage = 0;
    let isBlocked = false;

    // Health Colors
    if (tire) {
        const depth = tire.currentTreadDepth;
        const original = tire.originalTreadDepth || 16;
        lifePercentage = Math.max(0, Math.min(100, (depth / original) * 100));
        
        const min = settings?.minTreadDepth || 3;
        const warn = settings?.warningTreadDepth || 5;

        if (depth <= 2) {
            strokeColor = '#ef4444'; // Red
            fillColor = '#450a0a'; // Dark Red
            isBlocked = true;
        } else if (depth <= 4) {
            strokeColor = '#f59e0b'; // Amber
            fillColor = '#451a03'; // Dark Amber
        } else {
            strokeColor = '#10b981'; // Green
            fillColor = '#064e3b'; // Dark Green
        }
    }

    return (
      <g
        key={pos}
        className={`transition-all duration-200 group`}
        style={{ transformOrigin: `${x}px ${y}px` }}
      >
        {/* Hover Effect Ring */}
        <rect
            x={x - (tireW/2 + 2)} y={y - (tireH/2 + 2)} width={tireW + 4} height={tireH + 4} rx="5"
            fill="transparent" stroke="white" strokeWidth="2" opacity="0"
            className="group-hover:opacity-30 transition-opacity"
        />

        {/* Tire Body */}
        <rect 
            x={x - tireW/2} y={y - tireH/2} width={tireW} height={tireH} rx="4" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth={tire ? 2 : 1.5}
            strokeDasharray={strokeDash}
        />
        
        {/* Detail Lines (If Tire Present) */}
        {tire && (
            <>
                <path d={`M ${x-6} ${y-12} L ${x+6} ${y-12}`} stroke={strokeColor} strokeWidth="1" opacity="0.5" />
                <path d={`M ${x-6} ${y+12} L ${x+6} ${y+12}`} stroke={strokeColor} strokeWidth="1" opacity="0.5" />
                
                {/* Life Bar (Video Game Style) */}
                <rect x={x - tireW/2 - 6} y={y - tireH/2} width="3" height={tireH} rx="1.5" fill="rgba(255,255,255,0.1)" />
                <rect 
                  x={x - tireW/2 - 6} 
                  y={y + tireH/2 - (tireH * (lifePercentage / 100))} 
                  width="3" 
                  height={tireH * (lifePercentage / 100)} 
                  rx="1.5" 
                  fill={strokeColor} 
                />
            </>
        )}

        {/* Info Badge */}
        <g transform={`translate(${x}, ${y + 32})`}>
            {tire ? (
                <>
                    <rect x="-20" y="-6" width="40" height="12" rx="2" fill="white" stroke="none" filter="drop-shadow(0 1px 1px rgba(0,0,0,0.1))" />
                    <text y="3" textAnchor="middle" fontSize="7" fontWeight="900" fill={isBlocked ? '#ef4444' : '#0f172a'}>{tire.currentTreadDepth}mm</text>
                </>
            ) : (
                <text y="2" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#64748b">VAGO</text>
            )}
        </g>
        
        {/* Position Label */}
        <text x={x} y={y - 30} textAnchor="middle" fontSize="7" fontWeight="bold" fill={'#94a3b8'}>{pos}</text>
      </g>
    );
  };

  return (
    <div className="w-full flex justify-center items-center p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-y-auto custom-scrollbar">
      <svg viewBox={`0 0 ${width} ${totalHeight}`} className="drop-shadow-xl shrink-0" style={{ maxWidth: '100%', height: 'auto', maxHeight: '400px' }}>
        {/* Chassis */}
        <rect x={cx - 6} y={40} width={12} height={totalHeight - 80} rx="3" fill="#1e293b" />
        {/* Cabin Indicator */}
        <path d={`M ${cx-30} 30 L ${cx+30} 30 L ${cx+35} 55 L ${cx-35} 55 Z`} fill="#334155" opacity="0.5" />
        
        {Array.from({ length: vehicle.axles }).map((_, i) => {
          const y = startY + (i * axleSpacing);
          const isSteer = isSteerAxle(vehicle.type, i, vehicleTypes);
          const isSupport = vehicle.type === 'BI-TRUCK' && i === vehicle.axles - 1;
          return (
            <g key={i}>
              <rect x={cx - 100} y={y - 3} width={200} height={6} rx="2" fill="#1e293b" />
              {isSteer ? (
                <>
                  {renderTire(`${i + 1}E`, cx - 75, y)}
                  {renderTire(`${i + 1}D`, cx + 75, y)}
                </>
              ) : isSupport ? (
                <>
                  {renderTire(`${i + 1}EE`, cx - 95, y)}
                  {renderTire(`${i + 1}EI`, cx - 60, y)}
                  {renderTire(`${i + 1}DI`, cx + 60, y)}
                  {renderTire(`${i + 1}DE`, cx + 95, y)}
                </>
              ) : (
                <>
                  {renderTire(`${i + 1}EE`, cx - 95, y)}
                  {renderTire(`${i + 1}EI`, cx - 60, y)}
                  {renderTire(`${i + 1}DI`, cx + 60, y)}
                  {renderTire(`${i + 1}DE`, cx + 95, y)}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
