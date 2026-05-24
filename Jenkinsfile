pipeline {
    agent any
    environment {
        DOCKERHUB_REPO = 'YOUR_DOCKERHUB_USERNAME/nexus-app'
        IMAGE_TAG      = "${env.BUILD_NUMBER}"
        IMAGE_LATEST   = 'latest'
    }
    options { timestamps(); buildDiscarder(logRotator(numToKeepStr:'10')); timeout(time:15,unit:'MINUTES') }
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Install')  { steps { dir('backend') { sh 'npm install' } } }
        stage('Test')     { steps { dir('backend') { sh 'npm test'    } } }
        stage('Build Image') {
            steps { sh """docker build -t ${DOCKERHUB_REPO}:${IMAGE_TAG} -t ${DOCKERHUB_REPO}:${IMAGE_LATEST} .""" }
        }
        stage('Push') {
            steps {
                withCredentials([usernamePassword(credentialsId:'dockerhub-creds',usernameVariable:'DH_USER',passwordVariable:'DH_PASS')]) {
                    sh """
                        echo "\$DH_PASS" | docker login -u "\$DH_USER" --password-stdin
                        docker push ${DOCKERHUB_REPO}:${IMAGE_TAG}
                        docker push ${DOCKERHUB_REPO}:${IMAGE_LATEST}
                        docker logout
                    """
                }
            }
        }
        stage('Deploy to EC2') {
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId:'ec2-ssh-key',keyFileVariable:'SSH_KEY'),
                    string(credentialsId:'ec2-host',variable:'EC2_HOST')
                ]) {
                    sh """
                        ssh -i \$SSH_KEY -o StrictHostKeyChecking=no \$EC2_HOST \
                            "docker pull ${DOCKERHUB_REPO}:${IMAGE_LATEST} && \
                             docker stop nexus-app || true ; \
                             docker rm   nexus-app || true ; \
                             docker run -d --name nexus-app --restart unless-stopped \
                               -p 80:3000 \
                               -v nexus-data:/app/data \
                               -v nexus-uploads:/app/uploads \
                               -e JWT_SECRET=change-this-in-prod \
                               ${DOCKERHUB_REPO}:${IMAGE_LATEST} && \
                             docker image prune -f"
                    """
                }
            }
        }
    }
    post {
        success { echo '✓ Nexus deployed.' }
        failure { echo '✗ Pipeline failed.' }
        always  { sh 'docker image prune -f || true' }
    }
}
