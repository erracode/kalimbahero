import { createRootRoute, Outlet, HeadContent } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const queryClient = new QueryClient();

export const Route = createRootRoute({
	component: () => (
		<QueryClientProvider client={queryClient}>
			<div className="dark">
				<AuthWrapper />
				<HeadContent />
				<Outlet />
				{/* <TanStackRouterDevtools /> */}
			</div>
		</QueryClientProvider>
	),
});

// Separate component for hook usage inside Provider context (though here we are inside QueryProvider, we need to be careful with imports)
// Actually we can just import the store hook directly.
import { useUIStore } from "@/stores/uiStore";
import { SkewedSheet } from "@/components/ui/SkewedSheet";
import { AuthPanel } from "@/components/auth/AuthPanel";

function AuthWrapper() {
	const { isAuthOpen, closeAuth } = useUIStore();
	return (
		<SkewedSheet isOpen={isAuthOpen} onClose={closeAuth} side="left">
			<AuthPanel onAuthSuccess={closeAuth} />
		</SkewedSheet>
	);
}
