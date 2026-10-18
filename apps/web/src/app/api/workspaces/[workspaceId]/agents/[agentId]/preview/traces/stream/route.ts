import { gatewayBaseUrl, getAccessTokenFromCookies } from "@/lib/server/gateway/fetch";
export const dynamic = "force-dynamic";
export async function GET(request: Request, {params}: {params:{workspaceId:string;agentId:string}}) {
 const token=await getAccessTokenFromCookies();if(!token)return Response.json({error:{message:"Not signed in"}},{status:401});
 const sessionId=new URL(request.url).searchParams.get("sessionId");if(!sessionId)return Response.json({error:{message:"Session is required"}},{status:400});
 const path=`/v1/workspaces/${encodeURIComponent(params.workspaceId)}/agents/${encodeURIComponent(params.agentId)}/preview/traces/stream?sessionId=${encodeURIComponent(sessionId)}`;
 const upstream=await fetch(`${gatewayBaseUrl()}${path}`,{headers:{authorization:`Bearer ${token}`,accept:"text/event-stream"},cache:"no-store",signal:request.signal});
 return new Response(upstream.body,{status:upstream.status,headers:{"Content-Type":upstream.headers.get("content-type")??"application/json","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no"}});
}
