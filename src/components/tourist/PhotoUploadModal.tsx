import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Camera, Upload, Sparkles, ShieldCheck, Check } from 'lucide-react';

export const PhotoUploadModal: React.FC = () => {
  const { 
    isPhotoModalOpen, 
    setIsPhotoModalOpen, 
    placeForReview, 
    submitReviewAndSeals,
    t 
  } = useApp();

  const [authorName, setAuthorName] = useState<string>('Wambra Explorador');
  const [comment, setComment] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=600&q=80');
  
  // 3B + S seals voting state
  const [seals, setSeals] = useState({
    bueno: true,
    bonito: true,
    barato: true,
    seguro: true
  });

  if (!isPhotoModalOpen || !placeForReview) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    submitReviewAndSeals(placeForReview.id, {
      usuario_nombre: authorName,
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      comentario: comment,
      foto_url: photoUrl,
      sellos_otorgados: seals
    });

    setIsPhotoModalOpen(false);
    setComment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-extrabold text-white">
                Subir Foto y Otorgar Sellos Andinos
              </h2>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                {placeForReview.titulo}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPhotoModalOpen(false)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Sello Anti Pay-to-win notice */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-tight">
            ✦ <strong>Voto Verificado:</strong> Los sellos 3B+S no se compran con comisiones ni planes de pago. Solo los viajeros reales los otorgan.
          </div>

          {/* Sello 3B + S Toggles */}
          <div className="space-y-2">
            <label className="font-bold text-white block">
              Otorga los Sellos Andinos que merece este lugar:
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSeals(prev => ({ ...prev, bueno: !prev.bueno }))}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  seals.bueno 
                    ? 'bg-amber-500/20 border-amber-400 text-white font-bold' 
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <p className="text-xs">✦ Bueno (B)</p>
                  <p className="text-[10px] text-slate-400 font-normal">Buena atención y guías</p>
                </div>
                {seals.bueno && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => setSeals(prev => ({ ...prev, bonito: !prev.bonito }))}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  seals.bonito 
                    ? 'bg-amber-500/20 border-amber-400 text-white font-bold' 
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <p className="text-xs">✦ Bonito (B)</p>
                  <p className="text-[10px] text-slate-400 font-normal">Paisaje y memoria viva</p>
                </div>
                {seals.bonito && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => setSeals(prev => ({ ...prev, barato: !prev.barato }))}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  seals.barato 
                    ? 'bg-amber-500/20 border-amber-400 text-white font-bold' 
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <p className="text-xs">✦ Barato (B)</p>
                  <p className="text-[10px] text-slate-400 font-normal">Precio justo mochilero</p>
                </div>
                {seals.barato && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => setSeals(prev => ({ ...prev, seguro: !prev.seguro }))}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  seals.seguro 
                    ? 'bg-emerald-950/40 border-emerald-400 text-emerald-200 font-bold' 
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <p className="text-xs">🛡️ Seguro (+S)</p>
                  <p className="text-[10px] text-slate-400 font-normal">Comunidad organizada</p>
                </div>
                {seals.seguro && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Author Name */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Tu Nombre de Wambra</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-400 outline-none"
            />
          </div>

          {/* Comment */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Tu Testimonio / Consejo para la Comunidad</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué tal estuvo la comida? ¿El camino? ¿Algún tip para otros wambras?"
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-400 outline-none placeholder:text-slate-500"
              required
            />
          </div>

          {/* Photo Preview / URL */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Foto de tu Experiencia (URL o Simulación)</label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-[11px] focus:border-amber-400 outline-none"
            />
            {photoUrl && (
              <div className="mt-2 h-32 rounded-xl overflow-hidden border border-slate-700">
                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg hover:opacity-95 transition-opacity"
            >
              Publicar Reseña y Confirmar Sellos
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
