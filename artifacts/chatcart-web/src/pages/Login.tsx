import { useState } from "react";
import { useLocation } from "wouter";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    sendOtp.mutate({ data: { phone } }, {
      onSuccess: () => {
        setStep("otp");
        toast({ title: "OTP Sent", description: "Please check your phone" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    verifyOtp.mutate({ data: { phone, otp } }, {
      onSuccess: (data) => {
        setToken(data.token);
        setLocation("/dashboard");
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        {/* Light-themed header with Chatcart C logo */}
        <div className="bg-primary p-8 text-white text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-white text-3xl font-extrabold leading-none">C</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Chatcart</h1>
          <p className="text-white/80">Manage your catalogue, your way</p>
        </div>

        <div className="p-8">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  placeholder="+91 98765 43210" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={sendOtp.isPending}
                  className="text-lg py-6"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full py-6 text-lg" 
                disabled={!phone || sendOtp.isPending}
              >
                {sendOtp.isPending ? "Sending..." : "Continue"}
                {!sendOtp.isPending && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <button 
                    type="button" 
                    onClick={() => setStep("phone")}
                    className="text-xs text-primary hover:underline"
                  >
                    Change phone
                  </button>
                </div>
                <Input 
                  id="otp" 
                  placeholder="000000" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={verifyOtp.isPending}
                  className="text-center text-2xl tracking-widest py-6"
                  maxLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full py-6 text-lg"
                disabled={!otp || verifyOtp.isPending}
              >
                {verifyOtp.isPending ? "Verifying..." : "Verify & Login"}
                {!verifyOtp.isPending && <CheckCircle2 className="w-5 h-5 ml-2" />}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
