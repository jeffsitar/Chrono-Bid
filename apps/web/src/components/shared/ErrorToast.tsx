'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  message: string | null;
}

export function ErrorToast({ message }: Props) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="glass-panel fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border-red-400/30 px-4 py-2.5 text-sm text-red-300"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
