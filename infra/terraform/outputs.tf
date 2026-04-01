output "namespace" {
  description = "The team namespace"
  value       = var.namespace
}

output "app_url" {
  description = "Public application URL"
  value       = "https://${var.namespace}.chas.retro87.se"
}

output "redis_dns" {
  description = "Redis service DNS"
  value       = module.redis.service_dns
}

output "resource_summary" {
  description = "Summary of deployed resources"
  value = {
    deployments = [module.redis.deployment_name, module.api.deployment_name, module.frontend.deployment_name]
    services    = [module.redis.service_name, module.api.service_name, module.frontend.service_name]
    namespace   = var.namespace
  }
}
