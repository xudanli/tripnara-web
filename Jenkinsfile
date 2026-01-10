pipeline {
    agent any
    
    tools {
        nodejs 'node20'
    }

    environment {
        // 【修改点】请填写您的 Docker Hub 用户名
        DOCKER_USER = 'loomtrip'
        IMAGE_NAME = "tripnara-frontend"
        DOCKER_CREDS_ID = 'dockerhub-creds'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }

        stage('Docker Build & Push') {
            steps {
                script {
                    def dockerImage = docker.build("${DOCKER_USER}/${IMAGE_NAME}:${env.BUILD_ID}")
                    docker.withRegistry('', "${DOCKER_CREDS_ID}") {
                        dockerImage.push()
                        dockerImage.push('latest')
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                sh "docker stop ${IMAGE_NAME} || true"
                sh "docker rm ${IMAGE_NAME} || true"
                // 前端通常映射 80 端口
                sh "docker run -d --name ${IMAGE_NAME} -p 80:80 ${DOCKER_USER}/${IMAGE_NAME}:latest"
            }
        }
    }
}
