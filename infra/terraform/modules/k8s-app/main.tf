variable "name" {
  description = "Application name"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
}

variable "image" {
  description = "Container image"
  type        = string
}

variable "port" {
  description = "Container port"
  type        = number
}

variable "replicas" {
  description = "Number of replicas"
  type        = number
  default     = 1
}

variable "cpu_request" {
  type    = string
  default = "100m"
}

variable "memory_request" {
  type    = string
  default = "128Mi"
}

variable "cpu_limit" {
  type    = string
  default = "500m"
}

variable "memory_limit" {
  type    = string
  default = "512Mi"
}

variable "env_vars" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Additional labels"
  type        = map(string)
  default     = {}
}

variable "image_pull_secret" {
  description = "Optional imagePullSecret name"
  type        = string
  default     = null
}

variable "container_port_name" {
  description = "Optional container port name"
  type        = string
  default     = null
}

variable "service_port_name" {
  description = "Optional service port name"
  type        = string
  default     = null
}

variable "env_from_configmap_name" {
  description = "Optional configmap name for env_from"
  type        = string
  default     = null
}

variable "liveness_http_path" {
  description = "If set, creates an HTTP liveness probe on var.port"
  type        = string
  default     = null
}

variable "liveness_tcp" {
  description = "If true, creates a TCP liveness probe on var.port"
  type        = bool
  default     = false
}

variable "liveness_exec_command" {
  description = "If set, creates an exec liveness probe"
  type        = list(string)
  default     = null
}

variable "liveness_initial_delay_seconds" {
  type    = number
  default = 0
}

variable "liveness_period_seconds" {
  type    = number
  default = 10
}

variable "readiness_http_path" {
  description = "If set, creates an HTTP readiness probe on var.port"
  type        = string
  default     = null
}

variable "readiness_exec_command" {
  description = "If set, creates an exec readiness probe"
  type        = list(string)
  default     = null
}

variable "readiness_initial_delay_seconds" {
  type    = number
  default = 0
}

variable "readiness_period_seconds" {
  type    = number
  default = 10
}

variable "read_only_root_filesystem" {
  description = "Whether the container root filesystem should be read-only"
  type        = bool
  default     = true
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = var.name
    namespace = var.namespace
    labels = merge({
      app = var.name
    }, var.labels)
  }

  spec {
    replicas = var.replicas
    selector {
      match_labels = { app = var.name }
    }
    template {
      metadata {
        labels = merge({ app = var.name }, var.labels)
      }
      spec {
        security_context {
          run_as_non_root = true
          seccomp_profile {
            type = "RuntimeDefault"
          }
        }

        dynamic "image_pull_secrets" {
          for_each = var.image_pull_secret == null ? [] : [var.image_pull_secret]
          content {
            name = image_pull_secrets.value
          }
        }

        container {
          name  = var.name
          image = var.image

          security_context {
            allow_privilege_escalation = false
            read_only_root_filesystem  = var.read_only_root_filesystem

            capabilities {
              drop = ["ALL"]
            }
          }

          port {
            container_port = var.port
            name           = var.container_port_name
          }

          dynamic "env_from" {
            for_each = var.env_from_configmap_name == null ? [] : [var.env_from_configmap_name]
            content {
              config_map_ref {
                name = env_from.value
              }
            }
          }

          resources {
            requests = {
              cpu    = var.cpu_request
              memory = var.memory_request
            }
            limits = {
              cpu    = var.cpu_limit
              memory = var.memory_limit
            }
          }
          dynamic "env" {
            for_each = var.env_vars
            content {
              name  = env.key
              value = env.value
            }
          }

          dynamic "liveness_probe" {
            for_each = var.liveness_http_path == null ? [] : [1]
            content {
              http_get {
                path = var.liveness_http_path
                port = var.port
              }
              initial_delay_seconds = var.liveness_initial_delay_seconds
              period_seconds        = var.liveness_period_seconds
            }
          }

          dynamic "liveness_probe" {
            for_each = var.liveness_tcp ? [1] : []
            content {
              tcp_socket {
                port = var.port
              }
              initial_delay_seconds = var.liveness_initial_delay_seconds
              period_seconds        = var.liveness_period_seconds
            }
          }

          dynamic "liveness_probe" {
            for_each = var.liveness_exec_command == null ? [] : [1]
            content {
              exec {
                command = var.liveness_exec_command
              }
              initial_delay_seconds = var.liveness_initial_delay_seconds
              period_seconds        = var.liveness_period_seconds
            }
          }

          dynamic "readiness_probe" {
            for_each = var.readiness_http_path == null ? [] : [1]
            content {
              http_get {
                path = var.readiness_http_path
                port = var.port
              }
              initial_delay_seconds = var.readiness_initial_delay_seconds
              period_seconds        = var.readiness_period_seconds
            }
          }

          dynamic "readiness_probe" {
            for_each = var.readiness_exec_command == null ? [] : [1]
            content {
              exec {
                command = var.readiness_exec_command
              }
              initial_delay_seconds = var.readiness_initial_delay_seconds
              period_seconds        = var.readiness_period_seconds
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "app" {
  metadata {
    name      = "${var.name}-service"
    namespace = var.namespace
    labels = {
      app = var.name
    }
  }
  spec {
    selector = { app = var.name }
    port {
      port        = var.port
      target_port = var.port
      name        = var.service_port_name
    }
  }
}

output "deployment_name" {
  value = kubernetes_deployment.app.metadata[0].name
}

output "service_name" {
  value = kubernetes_service.app.metadata[0].name
}

output "service_dns" {
  value = "${kubernetes_service.app.metadata[0].name}.${var.namespace}.svc.cluster.local"
}
