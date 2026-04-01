moved {
  from = kubernetes_deployment.redis
  to   = module.redis.kubernetes_deployment.app
}

moved {
  from = kubernetes_service.redis
  to   = module.redis.kubernetes_service.app
}

moved {
  from = kubernetes_deployment.api
  to   = module.api.kubernetes_deployment.app
}

moved {
  from = kubernetes_service.api
  to   = module.api.kubernetes_service.app
}

moved {
  from = kubernetes_deployment.frontend
  to   = module.frontend.kubernetes_deployment.app
}

moved {
  from = kubernetes_service.frontend
  to   = module.frontend.kubernetes_service.app
}

resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "terraform-demo"
    namespace = var.namespace

    labels = {
      managed-by = "terraform"
      team       = var.namespace
    }
  }

  data = {
    APP_ENV     = "production"
    APP_VERSION = "2.0.0"
    MANAGED_BY  = "terraform"
  }
}

resource "kubernetes_config_map" "api_config" {
  metadata {
    name      = "api-config"
    namespace = var.namespace
    labels = {
      app = "api"
    }
  }

  data = {
    TEAM_NAME  = var.namespace
    NAMESPACE  = var.namespace
    REDIS_HOST = "redis-service"
    REDIS_PORT = "6379"
    PORT       = "3000"
  }
}

module "redis" {
  source    = "./modules/k8s-app"
  name      = "redis"
  namespace = var.namespace
  image     = var.redis_image
  port      = 6379
  labels    = { tier = "database" }

  container_port_name = "redis"
  service_port_name   = "redis"

  liveness_tcp                   = true
  liveness_initial_delay_seconds = 5
  liveness_period_seconds        = 10

  readiness_exec_command          = ["redis-cli", "ping"]
  readiness_initial_delay_seconds = 5
  readiness_period_seconds        = 5
  read_only_root_filesystem       = false

  cpu_request    = "100m"
  memory_request = "128Mi"
  cpu_limit      = "200m"
  memory_limit   = "256Mi"
}

module "api" {
  source    = "./modules/k8s-app"
  name      = "api"
  namespace = var.namespace
  image     = var.api_image
  port      = 3000
  replicas  = var.api_replicas
  labels    = { tier = "backend" }

  image_pull_secret   = "gcr-secret"
  container_port_name = "http"
  service_port_name   = "http"

  env_from_configmap_name = kubernetes_config_map.api_config.metadata[0].name

  liveness_http_path             = "/health"
  liveness_initial_delay_seconds = 10
  liveness_period_seconds        = 10

  readiness_http_path             = "/health"
  readiness_initial_delay_seconds = 5
  readiness_period_seconds        = 5

  cpu_request    = "100m"
  memory_request = "128Mi"
  cpu_limit      = "200m"
  memory_limit   = "256Mi"

  depends_on = [module.redis, kubernetes_config_map.api_config]
}

module "frontend" {
  source    = "./modules/k8s-app"
  name      = "frontend"
  namespace = var.namespace
  image     = var.frontend_image
  port      = 80
  replicas  = 2
  labels    = { tier = "frontend" }

  image_pull_secret   = "gcr-secret"
  container_port_name = "http"
  service_port_name   = "http"

  liveness_http_path             = "/"
  liveness_initial_delay_seconds = 5
  liveness_period_seconds        = 10

  readiness_http_path             = "/"
  readiness_initial_delay_seconds = 5
  readiness_period_seconds        = 5

  cpu_request    = "100m"
  memory_request = "128Mi"
  cpu_limit      = "200m"
  memory_limit   = "256Mi"

  depends_on = [module.api]
}
