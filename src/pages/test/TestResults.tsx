import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function TestResults() {

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-primary/20 bg-gradient-to-b from-background to-primary/5 shadow-lg">
            <CardContent className="pt-10 pb-8 px-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </motion.div>
              
              <h1 className="text-3xl font-heading font-bold mb-4">Test Submitted Successfully</h1>
              
              <p className="text-muted-foreground mb-8 text-lg">
                Your responses have been recorded.
              </p>

              <div className="p-4 rounded-xl bg-muted/50 border border-dashed text-sm font-semibold text-muted-foreground">
                You can close this tab now
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}