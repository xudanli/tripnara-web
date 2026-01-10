pipeline {
    /* 将 agent any 改为 docker 模式
      使用 node:20-bullseye (Debian) 镜像，它自带了 libatomic 等所有基础库
    */
    agent {
        docker {
            image 'node:20-bullseye'
            // 以后如果你需要用到宿主机的 docker 命令（比如构建镜像），可以挂载 sock
            args '-u root' 
        }
    }

    environment {
        DOCKER_USER = 'loomtrip' 
        IMAGE_NAME = "tripnara-frontend"
        DOCKER_CREDS_ID = 'dockerhub-creds'
    }

    stages {
        // 注意：现在不需要在 stages 前写 tools { nodejs 'node20' } 了，
        // 因为整个环境已经是 node 环境。

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                // 这里直接执行，它会在 node 容器内部运行
                sh 'node -v'
                sh 'npm install'
                sh 'npm run build'
            }
        }

        stage('Docker Build & Push') {
            when {
                expression { env.DOCKER_CREDS_ID != null && env.DOCKER_CREDS_ID != '' }
            }
            steps {
                script {
                    try {
                        /* 这里需要特别注意：
                           在 Docker Agent 内部构建 Docker 镜像，通常需要宿主机开启 Docker-in-Docker 
                           或者确保 Jenkins 插件支持。
                           如果凭据不存在，此阶段将被跳过
                        */
                        docker.withRegistry('', "${DOCKER_CREDS_ID}") {
                            def img = docker.build("${DOCKER_USER}/${IMAGE_NAME}:${env.BUILD_ID}")
                            img.push()
                            img.push('latest')
                        }
                    } catch (Exception e) {
                        echo "Warning: Docker build/push failed: ${e.getMessage()}"
                        echo "This is expected if dockerhub-creds is not configured. Build artifacts are still available."
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
    }
}