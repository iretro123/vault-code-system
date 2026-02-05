 import { useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card } from "@/components/ui/card";
 import { Shield, ArrowLeft } from "lucide-react";
 import { Link } from "react-router-dom";
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/hooks/useAuth";
 
 const Auth = () => {
   const { toast } = useToast();
   const { signIn, signUp } = useAuth();
   const navigate = useNavigate();
   const [mode, setMode] = useState<"login" | "signup">("login");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [loading, setLoading] = useState(false);
   
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     
     const { error } = mode === "login" 
       ? await signIn(email, password)
       : await signUp(email, password);
     
     if (error) {
       toast({
         title: "Error",
         description: error.message,
         variant: "destructive",
       });
     } else if (mode === "signup") {
       toast({
         title: "Check your email",
         description: "We sent you a confirmation link.",
       });
     } else {
       toast({
         title: "Welcome back",
         description: "You have been signed in.",
       });
       navigate("/");
     }
     
     setLoading(false);
   };
   
   return (
     <div className="min-h-screen bg-background flex flex-col">
       {/* Header */}
       <header className="px-4 py-4">
         <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
           <ArrowLeft className="w-4 h-4" />
           <span className="text-sm">Back</span>
         </Link>
       </header>
       
       <main className="flex-1 flex items-center justify-center px-4 pb-8">
         <div className="w-full max-w-sm">
           {/* Logo */}
           <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
               <Shield className="w-7 h-7 text-primary" />
             </div>
             <h1 className="text-2xl font-semibold">VAULT OS</h1>
             <p className="text-muted-foreground text-sm mt-1">
               {mode === "login" ? "Welcome back" : "Create your account"}
             </p>
           </div>
           
           {/* Form */}
           <Card className="p-6">
             <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <Label htmlFor="email" className="text-sm text-muted-foreground">
                   Email
                 </Label>
                 <Input
                   id="email"
                   type="email"
                   placeholder="you@example.com"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="mt-1.5 h-12"
                   required
                 />
               </div>
               
               <div>
                 <Label htmlFor="password" className="text-sm text-muted-foreground">
                   Password
                 </Label>
                 <Input
                   id="password"
                   type="password"
                   placeholder="••••••••"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="mt-1.5 h-12"
                   required
                   minLength={8}
                 />
               </div>
               
               <Button 
                 type="submit" 
                 className="w-full h-12 text-base font-medium"
                 disabled={loading}
               >
                 {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
               </Button>
             </form>
           </Card>
           
           {/* Toggle Mode */}
           <p className="text-center text-sm text-muted-foreground mt-6">
             {mode === "login" ? "Don't have an account?" : "Already have an account?"}
             <button
               type="button"
               onClick={() => setMode(mode === "login" ? "signup" : "login")}
               className="text-primary hover:underline ml-1 font-medium"
             >
               {mode === "login" ? "Sign up" : "Sign in"}
             </button>
           </p>
         </div>
       </main>
     </div>
   );
 };
 
 export default Auth;