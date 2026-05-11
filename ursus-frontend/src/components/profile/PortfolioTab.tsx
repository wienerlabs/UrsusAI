import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { PortfolioRow } from '../../hooks/useUserPortfolio';
import { formatCompactNumber, formatSignedSol, formatSol } from '../../utils/profile';

interface PortfolioTabProps {
  rows: PortfolioRow[];
  totalValue: number;
  totalRealized: number;
  totalPnL: number;
  loading: boolean;
}

export function PortfolioTab({
  rows,
  totalValue,
  totalRealized,
  totalPnL,
  loading,
}: PortfolioTabProps) {
  const openCount = rows.filter((r) => r.status === 'open').length;
  const closedCount = rows.filter((r) => r.status === 'closed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h3 className="text-white text-xl font-semibold">Portfolio</h3>
          <p className="text-[#a0a0a0] text-sm mt-1">
            {loading
              ? 'Loading positions…'
              : `${openCount} open · ${closedCount} closed`}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-right">
          <div>
            <div className="text-[#a0a0a0] text-xs uppercase">Open Value</div>
            <div className="text-white text-lg font-semibold">
              {loading ? '—' : formatSol(totalValue)}
            </div>
          </div>
          <div>
            <div className="text-[#a0a0a0] text-xs uppercase">Realized</div>
            <div
              className={`text-lg font-semibold ${
                totalRealized > 0
                  ? 'text-[#10b981]'
                  : totalRealized < 0
                  ? 'text-[#ef4444]'
                  : 'text-white'
              }`}
            >
              {loading ? '—' : formatSignedSol(totalRealized)}
            </div>
          </div>
          <div>
            <div className="text-[#a0a0a0] text-xs uppercase">Total PnL</div>
            <div
              className={`text-lg font-semibold ${
                totalPnL > 0
                  ? 'text-[#10b981]'
                  : totalPnL < 0
                  ? 'text-[#ef4444]'
                  : 'text-white'
              }`}
            >
              {loading ? '—' : formatSignedSol(totalPnL)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th scope="col" className="text-left p-4 text-[#a0a0a0] font-medium">
                  Token
                </th>
                <th scope="col" className="text-right p-4 text-[#a0a0a0] font-medium">
                  Holdings
                </th>
                <th scope="col" className="text-right p-4 text-[#a0a0a0] font-medium">
                  Invested
                </th>
                <th scope="col" className="text-right p-4 text-[#a0a0a0] font-medium">
                  Value
                </th>
                <th scope="col" className="text-right p-4 text-[#a0a0a0] font-medium">
                  PnL
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-6 text-[#a0a0a0]" colSpan={5}>
                    Loading portfolio…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="p-6 text-[#a0a0a0]" colSpan={5}>
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Wallet size={32} className="text-[#2a2a2a]" />
                      <span>No trading activity yet.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isClosed = row.status === 'closed';
                  const pnlColor =
                    row.totalPnL > 0
                      ? 'text-[#10b981]'
                      : row.totalPnL < 0
                      ? 'text-[#ef4444]'
                      : 'text-[#a0a0a0]';
                  return (
                    <tr
                      key={row.agentAddress}
                      className="border-b border-[#2a2a2a] hover:bg-[#0a0a0a] transition-colors"
                    >
                      <td className="p-4">
                        <Link
                          to={`/agent/${encodeURIComponent(row.agentAddress)}`}
                          className="flex items-center gap-3 hover:text-[#d8e9ea] transition-colors"
                        >
                          <div className="w-9 h-9 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg flex items-center justify-center overflow-hidden text-sm text-black font-semibold shrink-0">
                            {row.icon ? (
                              <img
                                src={row.icon}
                                alt={`${row.token} logo`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              (row.symbol || 'A').charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium truncate">
                                {row.token}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                                  isClosed
                                    ? 'bg-[#2a2a2a] text-[#a0a0a0]'
                                    : 'bg-[#10b981]/10 text-[#10b981]'
                                }`}
                              >
                                {isClosed ? 'Closed' : 'Open'}
                              </span>
                            </div>
                            <div className="text-[#a0a0a0] text-xs">
                              {row.symbol} · {row.buyCount}B/{row.sellCount}S
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="p-4 text-right text-white">
                        {row.holdings > 0 ? formatCompactNumber(row.holdings) : '—'}
                      </td>
                      <td className="p-4 text-right text-white">
                        {formatSol(row.totalInvested)}
                      </td>
                      <td className="p-4 text-right text-white">
                        {row.status === 'open' ? formatSol(row.value) : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <div className={`font-medium ${pnlColor}`}>
                          {formatSignedSol(row.totalPnL)}
                        </div>
                        {Math.abs(row.pnlPct) > 0.01 && (
                          <div className={`text-xs ${pnlColor}`}>
                            {row.pnlPct >= 0 ? '+' : ''}
                            {row.pnlPct.toFixed(2)}%
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PortfolioTab;
