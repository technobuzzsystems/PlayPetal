import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { getBuyBoxAudit } from '../../services/api';
import type { BuyBoxAuditResult, BuyBoxCandidate, DisqualifiedOffer } from '../../types';
import {
  Trophy,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
  Truck,
  Star,
} from 'lucide-react';

interface BuyBoxAuditModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BuyBoxAuditModal: React.FC<BuyBoxAuditModalProps> = ({
  productId,
  isOpen,
  onClose,
}) => {
  const [audit, setAudit] = useState<BuyBoxAuditResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBuyBoxAudit(productId);
      setAudit(data);
    } catch (err: any) {
      console.error('Failed to fetch Buy Box audit:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to load Buy Box audit evaluation.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && productId) {
      fetchAudit();
    } else {
      setAudit(null);
      setError(null);
    }
  }, [isOpen, productId]);

  const winner = audit?.scoredCandidates.find((c: BuyBoxCandidate) => c.offerId === audit.winningOfferId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buy Box Algorithmic Audit"
      description={
        audit
          ? `${audit.masterProductName} (SKU: ${audit.masterProductSku || 'N/A'})`
          : 'Evaluating marketplace competition rankings...'
      }
      size="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={fetchAudit}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-evaluate Audit
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {loading && (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              Running multi-factor Buy Box ranking algorithm across competing seller offers...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <p className="font-bold">Audit Evaluation Failed</p>
              <p className="mt-0.5">{error}</p>
              <button
                type="button"
                onClick={fetchAudit}
                className="mt-2 text-xs font-bold text-rose-800 underline cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {audit && !loading && (
          <>
            {/* 1. Winner Banner */}
            {audit.winningOfferId && winner ? (
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                          Winning Offer (Buy Box)
                        </span>
                        <span className="text-xs font-mono text-slate-500 font-semibold">
                          ID: {audit.winningOfferId}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1">
                        {winner.sellerName}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {audit.buyBoxResult?.reason ||
                          'Highest composite score across price, delivery speed, seller reputation, and warranty.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200/60 shrink-0">
                    <div className="text-2xl font-black text-emerald-700">
                      ₹{Number(winner.effectivePrice).toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-slate-600 mt-0.5">
                      Composite Score:{' '}
                      <span className="text-indigo-600 font-black">
                        {Number(winner.scores?.totalScore ?? winner.totalScore ?? 0).toFixed(2)}
                      </span>{' '}
                      / 100
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">No Active Buy Box Winner</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {audit.buyBoxResult?.reason ||
                      'No active seller offer meets inventory and eligibility criteria. This product displays as Out of Stock on the storefront.'}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Scored Candidates Ranking Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Scored Seller Candidates ({audit.scoredCandidates.length})
                  </h4>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Formula: Price 40% + Speed 25% + Trust 20% + Warranty 15%
                </div>
              </div>

              {audit.scoredCandidates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No competing seller offers currently qualified for scoring.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Seller & Offer</th>
                        <th className="py-2.5 px-3">Effective Price</th>
                        <th className="py-2.5 px-3">Delivery SLA</th>
                        <th className="py-2.5 px-3">Rating / Trust</th>
                        <th className="py-2.5 px-3">Warranty</th>
                        <th className="py-2.5 px-3 text-center">Score Breakdown</th>
                        <th className="py-2.5 px-3 text-right">Total Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {audit.scoredCandidates.map((c: BuyBoxCandidate, idx: number) => {
                        const isWinner = c.offerId === audit.winningOfferId;
                        return (
                          <tr
                            key={c.offerId}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isWinner ? 'bg-emerald-50/30' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-bold">
                              {isWinner ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-black">
                                  #1
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono pl-1.5">
                                  #{idx + 1}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{c.sellerName}</span>
                                {isWinner && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Winner
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Offer: {c.offerId}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-black text-slate-900">
                                ₹{Number(c.effectivePrice).toLocaleString()}
                              </div>
                              {c.salePrice && Number(c.basePrice) > Number(c.salePrice) && (
                                <div className="text-[10px] text-slate-400 line-through">
                                  ₹{Number(c.basePrice).toLocaleString()}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1 text-slate-700 font-semibold">
                                <Truck className="w-3 h-3 text-slate-400" />
                                {c.deliveryDays || c.estimatedDeliveryDays || 5} days
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {c.fulfillmentType === 'PLAY_PETAL_EXPRESS'
                                  ? 'Play Petal Express'
                                  : 'Seller Direct'}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1 font-bold text-slate-800">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                {Number(c.sellerRating).toFixed(1)}★
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {c.onTimeRate ? `${c.onTimeRate}% on-time` : 'Verified Seller'}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-700">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                {(c.warrantyType || 'Standard').replace(/_/g, ' ')}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1 text-[10px] font-mono">
                                <span
                                  className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold"
                                  title="Price Score (40% weight)"
                                >
                                  P:{Math.round(c.scores?.priceScore ?? 0)}
                                </span>
                                <span
                                  className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold"
                                  title="Speed Score (25% weight)"
                                >
                                  S:{Math.round(c.scores?.speedScore ?? 0)}
                                </span>
                                <span
                                  className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold"
                                  title="Trust Score (20% weight)"
                                >
                                  T:{Math.round(c.scores?.trustScore ?? 0)}
                                </span>
                                <span
                                  className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold"
                                  title="Warranty Score (15% weight)"
                                >
                                  W:{Math.round(c.scores?.warrantyScore ?? 0)}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <span
                                className={`text-sm font-black ${
                                  isWinner ? 'text-emerald-700' : 'text-slate-800'
                                }`}
                              >
                                {Number(c.scores?.totalScore ?? c.totalScore ?? 0).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. Disqualified Offers Section */}
            {audit.disqualifiedOffers && audit.disqualifiedOffers.length > 0 && (
              <div className="border border-rose-200/80 rounded-xl overflow-hidden bg-rose-50/30">
                <div className="px-4 py-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Disqualified Offers ({audit.disqualifiedOffers.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-rose-700 font-medium">
                    Filtered out before scoring due to business invariants
                  </span>
                </div>

                <div className="divide-y divide-rose-100">
                  {audit.disqualifiedOffers.map((d: DisqualifiedOffer) => (
                    <div
                      key={d.offerId}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{d.sellerName}</div>
                        <div className="text-[10px] font-mono text-slate-400">Offer: {d.offerId}</div>
                      </div>
                      <div className="sm:text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-3 h-3" />
                          {d.reason}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
