import { createRootRoute, Outlet, HeadContent } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const queryClient = new QueryClient();

export const Route = createRootRoute({
	component: () => (
		<QueryClientProvider client={queryClient}>
			<div className="dark">
				<HeadContent />
				<Outlet />
				{/* <TanStackRouterDevtools /> */}
			</div>
		</QueryClientProvider>
	),
});
