import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface LoginSuccessOverlayProps {
  show: boolean;
  message?: string;
}

export function LoginSuccessOverlay({ show, message = 'Welcome back!' }: LoginSuccessOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <CheckCircle className="w-12 h-12 text-green-500" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-xl font-display font-bold text-foreground"
            >
              {message}
            </motion.p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '6rem' }}
              transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
              className="h-1 rounded-full bg-green-500"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
